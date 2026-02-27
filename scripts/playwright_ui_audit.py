from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

from axe_playwright_python.sync_playwright import Axe
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import Playwright, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / "webapp" / "app.py"
OUT = ROOT / "outputs" / "ui_audit_001"
BASELINE = ROOT / "webapp" / "visual_baseline"
BASELINE_MANIFEST = BASELINE / "baseline_manifest.json"
BASE_URL = "http://127.0.0.1:8502"
TABS = [
    "Overview",
    "Model & Methods",
    "Operations & Cost",
    "Economics & Risk",
    "Benchmarks & Citations",
    "Downloads",
]
TAB_READY_TEXT = {
    "Overview": "Decision Overview",
    "Model & Methods": "Model and Methods",
    "Operations & Cost": "Operations and Cost",
    "Economics & Risk": "Economics and Risk",
    "Benchmarks & Citations": "Benchmarks and Citations",
    "Downloads": "Download and Reuse",
}
MAX_DCL_DESKTOP_MS = 8000
MAX_DCL_MOBILE_MS = 10000
MAX_DOM_NODES = 4000
VISUAL_DIFF_THRESHOLD = 0.02
MAX_TAB_INTERACTION_MS = 1200
MAX_MC_PANEL_MS = 2500


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _add_warning(report: dict[str, object], message: str) -> None:
    warnings = report["warnings"]
    if message not in warnings:
        warnings.append(message)


def _add_issue(report: dict[str, object], message: str) -> None:
    issues = report["issues"]
    if message not in issues:
        issues.append(message)


def wait_for_server(url: str, timeout_s: float = 30.0) -> None:
    start = time.time()
    while time.time() - start < timeout_s:
        try:
            with urlopen(url, timeout=2) as r:  # nosec - localhost check only
                if r.status == 200:
                    return
        except Exception:
            time.sleep(0.5)
    raise TimeoutError(f"Server did not start in {timeout_s}s: {url}")


def start_streamlit() -> subprocess.Popen:
    cmd = [
        "python",
        "-m",
        "streamlit",
        "run",
        str(APP_PATH),
        "--server.headless",
        "true",
        "--server.port",
        "8502",
        "--browser.gatherUsageStats",
        "false",
    ]
    return subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _launch_browser(p: Playwright, browser_name: str):
    if browser_name == "chromium":
        return p.chromium.launch(headless=True)
    if browser_name == "firefox":
        return p.firefox.launch(headless=True)
    if browser_name == "webkit":
        return p.webkit.launch(headless=True)
    raise ValueError(f"Unsupported browser: {browser_name}")


def assert_heading_structure(page) -> dict[str, int]:
    result = page.evaluate(
        """
        () => {
          const h1 = document.querySelectorAll('h1').length;
          const h2 = document.querySelectorAll('h2').length;
          const h3 = document.querySelectorAll('h3').length;
          const labelledInputs = Array.from(document.querySelectorAll('input,textarea,select')).filter(el => {
            const id = el.getAttribute('id');
            const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
            const byFor = id ? document.querySelector(`label[for="${id}"]`) : null;
            return Boolean(aria || byFor);
          }).length;
          const totalInputs = document.querySelectorAll('input,textarea,select').length;
          return {h1, h2, h3, labelledInputs, totalInputs};
        }
        """
    )
    assert result["h1"] >= 1
    return result


def dom_perf_probe(page) -> dict[str, float]:
    return page.evaluate(
        """
        () => {
          const nav = performance.getEntriesByType('navigation')[0];
          return {
            dcl_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
            load_ms: nav ? Math.round(nav.loadEventEnd) : -1,
            dom_nodes: document.querySelectorAll('*').length
          };
        }
        """
    )


def _warmup_tabs(page) -> None:
    for tab in TABS[1:]:
        page.get_by_role("tab", name=tab).click()
        page.get_by_role("heading", name=TAB_READY_TEXT[tab]).wait_for(timeout=10000)
    page.get_by_role("tab", name="Overview").click()
    page.get_by_role("heading", name=TAB_READY_TEXT["Overview"]).wait_for(timeout=10000)


def click_through_tabs_and_capture(page, prefix: str) -> tuple[list[str], dict[str, int]]:
    shots: list[str] = []
    timings: dict[str, int] = {}
    for tab in TABS:
        start = time.perf_counter()
        page.get_by_role("tab", name=tab).click()
        page.get_by_role("heading", name=TAB_READY_TEXT[tab]).wait_for(timeout=10000)
        elapsed = int((time.perf_counter() - start) * 1000)
        timings[tab] = elapsed
        path = OUT / f"{prefix}_{tab.lower().replace(' ', '_').replace('&', 'and')}.png"
        page.screenshot(path=str(path), full_page=True)
        shots.append(str(path))
    return shots, timings


def run_axe_scan(axe: Axe, page, label: str) -> dict[str, object]:
    result = axe.run(page, options={"resultTypes": ["violations"]})
    violations = result.response.get("violations", [])
    items: list[dict[str, object]] = []
    for v in violations:
        nodes = v.get("nodes", [])
        items.append(
            {
                "id": v.get("id", ""),
                "impact": v.get("impact", "unknown"),
                "help": v.get("help", ""),
                "help_url": v.get("helpUrl", ""),
                "node_count": len(nodes),
                "sample_targets": [n.get("target", []) for n in nodes[:3]],
            }
        )
    return {"page": label, "violation_count": len(items), "violations": items}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _pixel_delta_ratio(baseline: Path, current: Path) -> float:
    with Image.open(baseline).convert("RGB") as a, Image.open(current).convert("RGB") as b:
        if a.size != b.size:
            return 1.0
        diff = ImageChops.difference(a, b)
        stat = ImageStat.Stat(diff)
        mean = sum(stat.mean) / len(stat.mean)
        return float(mean / 255.0)


def _write_baseline_manifest() -> None:
    BASELINE.mkdir(parents=True, exist_ok=True)
    entries: dict[str, str] = {}
    for img in sorted(BASELINE.glob("*.png")):
        entries[img.name] = _sha256(img)
    payload = {"generated_at_unix": int(time.time()), "entries": entries}
    BASELINE_MANIFEST.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _visual_compare(report: dict[str, object], approve_baseline: bool, fail_on_visual_diff: bool) -> None:
    BASELINE.mkdir(parents=True, exist_ok=True)
    missing: list[str] = []
    changed: list[str] = []
    approved_updates: list[str] = []
    max_delta = 0.0

    for shot in report.get("screenshots", []):
        current = Path(str(shot))
        baseline = BASELINE / current.name
        if not baseline.exists():
            missing.append(current.name)
            if approve_baseline:
                shutil.copy2(current, baseline)
                approved_updates.append(current.name)
            continue
        if _sha256(current) == _sha256(baseline):
            continue
        delta = _pixel_delta_ratio(baseline, current)
        max_delta = max(max_delta, delta)
        if delta > VISUAL_DIFF_THRESHOLD:
            changed.append(current.name)
            if approve_baseline:
                shutil.copy2(current, baseline)
                approved_updates.append(current.name)

    if approve_baseline and approved_updates:
        _write_baseline_manifest()

    has_manifest = BASELINE_MANIFEST.exists()
    if approve_baseline and not has_manifest:
        _write_baseline_manifest()
        has_manifest = True

    report["checks"]["visual_regression"] = {
        "baseline_dir": str(BASELINE),
        "manifest_path": str(BASELINE_MANIFEST),
        "manifest_present": has_manifest,
        "new_baselines_created": len(missing),
        "changed_screenshots": changed,
        "approved_updates": approved_updates,
        "pixel_delta_threshold": VISUAL_DIFF_THRESHOLD,
        "max_pixel_delta_observed": round(max_delta, 6),
    }

    if missing and not approve_baseline:
        msg = f"Visual baseline missing for {len(missing)} screenshot(s)."
        if fail_on_visual_diff:
            _add_issue(report, msg + " Run with UI_AUDIT_APPROVE_BASELINE=1 to approve baseline.")
        else:
            _add_warning(report, msg)

    if changed and not approve_baseline:
        msg = f"Visual differences detected in {len(changed)} screenshot(s)."
        if fail_on_visual_diff:
            _add_issue(report, msg + " Run with UI_AUDIT_APPROVE_BASELINE=1 to approve updates.")
        else:
            _add_warning(report, msg)

    if approved_updates:
        _add_warning(report, f"Visual baseline approved/updated for {len(approved_updates)} screenshot(s).")

    if fail_on_visual_diff and not has_manifest:
        _add_issue(report, "Visual baseline manifest is missing; approval required before enforcing visual diffs.")


def _run_browser_audit(
    axe: Axe,
    p: Playwright,
    browser_name: str,
    report: dict[str, object],
    fail_on_perf_budget: bool,
) -> None:
    browser = _launch_browser(p, browser_name)
    try:
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(BASE_URL, wait_until="domcontentloaded")
        page.get_by_text("Panel Twin Feasibility Studio").wait_for(timeout=15000)
        page.get_by_text("Project Brief: Context, Goals, and Decision Criteria").wait_for(timeout=10000)

        page.keyboard.press("Tab")
        page.keyboard.press("Tab")
        heading = assert_heading_structure(page)
        report["checks"].setdefault("heading_and_labels", {})[browser_name] = heading

        perf = dom_perf_probe(page)
        report["checks"].setdefault("performance", {})[f"{browser_name}::desktop"] = perf
        if perf["dcl_ms"] > MAX_DCL_DESKTOP_MS:
            msg = f"{browser_name} desktop domContentLoaded exceeded budget: {perf['dcl_ms']}ms."
            if fail_on_perf_budget:
                _add_issue(report, msg)
            else:
                _add_warning(report, msg)
        if perf["dom_nodes"] > MAX_DOM_NODES:
            _add_warning(report, f"{browser_name} desktop DOM node count high: {perf['dom_nodes']}.")

        _warmup_tabs(page)
        shots, timings = click_through_tabs_and_capture(page, f"{browser_name}_desktop")
        report["screenshots"].extend(shots)
        report["checks"].setdefault("interaction_latency_ms", {})[browser_name] = timings
        slow_tabs = {k: v for k, v in timings.items() if v > MAX_TAB_INTERACTION_MS}
        if slow_tabs:
            msg = f"{browser_name} tab interactions over {MAX_TAB_INTERACTION_MS}ms: {slow_tabs}"
            if fail_on_perf_budget:
                _add_issue(report, msg)
            else:
                _add_warning(report, msg)

        axe_results: list[dict[str, object]] = []
        for tab in TABS:
            page.get_by_role("tab", name=tab).click()
            page.wait_for_timeout(300)
            axe_results.append(run_axe_scan(axe, page, f"{browser_name}::desktop::{tab}"))

        page.get_by_role("tab", name="Benchmarks & Citations").click()
        page.get_by_role("textbox", name="Search").fill("federal")
        page.wait_for_timeout(400)
        path_search = OUT / f"{browser_name}_desktop_search_federal.png"
        page.screenshot(path=str(path_search), full_page=True)
        report["screenshots"].append(str(path_search))

        mc_start = time.perf_counter()
        page.get_by_role("tab", name="Economics & Risk").click()
        page.get_by_text("NPV distribution summary is provided below for accessible review.").wait_for(timeout=10000)
        mc_elapsed = int((time.perf_counter() - mc_start) * 1000)
        report["checks"].setdefault("mc_panel_latency_ms", {})[browser_name] = mc_elapsed
        if mc_elapsed > MAX_MC_PANEL_MS:
            msg = f"{browser_name} MC panel latency exceeded budget: {mc_elapsed}ms."
            if fail_on_perf_budget:
                _add_issue(report, msg)
            else:
                _add_warning(report, msg)

        mctx_args = {"viewport": {"width": 390, "height": 844}, "has_touch": True}
        if browser_name in {"chromium", "webkit"}:
            mctx_args["is_mobile"] = True
        mctx = browser.new_context(**mctx_args)
        mpage = mctx.new_page()
        mpage.goto(BASE_URL, wait_until="domcontentloaded")
        mpage.get_by_text("Panel Twin Feasibility Studio").wait_for(timeout=15000)
        mperf = dom_perf_probe(mpage)
        report["checks"]["performance"][f"{browser_name}::mobile"] = mperf
        if mperf["dcl_ms"] > MAX_DCL_MOBILE_MS:
            msg = f"{browser_name} mobile domContentLoaded exceeded budget: {mperf['dcl_ms']}ms."
            if fail_on_perf_budget:
                _add_issue(report, msg)
            else:
                _add_warning(report, msg)

        mpage.get_by_role("tab", name="Overview").click()
        mpage.wait_for_timeout(400)
        mshot = OUT / f"{browser_name}_mobile_overview.png"
        mpage.screenshot(path=str(mshot), full_page=True)
        report["screenshots"].append(str(mshot))
        axe_results.append(run_axe_scan(axe, mpage, f"{browser_name}::mobile::Overview"))

        dom_a11y = page.evaluate(
            """
            () => {
              const landmarks = {
                nav: document.querySelectorAll('[role="navigation"]').length,
                main: document.querySelectorAll('main,[role="main"]').length,
                tablist: document.querySelectorAll('[role="tablist"]').length,
              };
              const controls = {
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input,select,textarea').length,
                labels: document.querySelectorAll('label').length,
              };
              return { landmarks, controls, title: document.title };
            }
            """
        )
        (OUT / f"accessibility_dom_audit_{browser_name}.json").write_text(
            json.dumps(dom_a11y, indent=2), encoding="utf-8"
        )

        (OUT / f"axe_violations_{browser_name}.json").write_text(json.dumps(axe_results, indent=2), encoding="utf-8")
        report["checks"].setdefault("axe", {})[browser_name] = _summarize_axe(axe_results, report, browser_name)

    finally:
        browser.close()


def _summarize_axe(
    axe_results: list[dict[str, object]],
    report: dict[str, object],
    browser_name: str,
) -> dict[str, int]:
    critical = 0
    serious = 0
    moderate = 0
    minor = 0
    moderate_ids: set[str] = set()
    for entry in axe_results:
        for v in entry["violations"]:
            impact = str(v.get("impact", "")).lower()
            if impact == "critical":
                critical += 1
            elif impact == "serious":
                serious += 1
            elif impact == "moderate":
                moderate += 1
                moderate_ids.add(str(v.get("id", "")))
            elif impact == "minor":
                minor += 1

    if critical > 0:
        _add_issue(report, f"{browser_name}: axe-core critical violations found: {critical}")
    if serious > 0:
        _add_issue(report, f"{browser_name}: axe-core serious violations found: {serious}")
    if moderate > 0:
        _add_warning(report, f"{browser_name}: axe-core moderate violations found: {moderate}, ids={sorted(moderate_ids)}")
        if moderate_ids == {"region"}:
            _add_warning(
                report,
                f"{browser_name}: remaining moderate violation is 'region' from Streamlit wrapper landmarks; tracked as framework limitation.",
            )

    return {
        "pages_scanned": len(axe_results),
        "critical": critical,
        "serious": serious,
        "moderate": moderate,
        "minor": minor,
    }


def run() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    approve_baseline = _bool_env("UI_AUDIT_APPROVE_BASELINE", default=False)
    fail_on_visual_diff = _bool_env("UI_AUDIT_FAIL_ON_VISUAL_DIFF", default=False)
    fail_on_perf_budget = _bool_env("UI_AUDIT_FAIL_ON_PERF_BUDGET", default=False)

    proc = start_streamlit()
    report: dict[str, object] = {"screenshots": [], "checks": {}, "issues": [], "warnings": []}
    try:
        wait_for_server(BASE_URL)
        browser_list = [x.strip() for x in os.getenv("UI_AUDIT_BROWSERS", "chromium,firefox,webkit").split(",") if x.strip()]
        with sync_playwright() as p:
            axe = Axe()
            for browser_name in browser_list:
                _run_browser_audit(axe, p, browser_name, report, fail_on_perf_budget=fail_on_perf_budget)
        _visual_compare(report, approve_baseline=approve_baseline, fail_on_visual_diff=fail_on_visual_diff)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except Exception:
            proc.kill()

    report["status"] = "pass" if not report["issues"] else "needs_attention"
    (OUT / "audit_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    summary = [
        "# UI Audit Summary",
        "",
        f"- Status: {report['status']}",
        f"- Screenshots captured: {len(report['screenshots'])}",
        f"- Issues: {len(report['issues'])}",
        f"- Warnings: {len(report['warnings'])}",
    ]
    if report["issues"]:
        summary.append("- Issue list:")
        summary.extend([f"  - {x}" for x in report["issues"]])
    if report["warnings"]:
        summary.append("- Warning list:")
        summary.extend([f"  - {x}" for x in report["warnings"]])
    (OUT / "audit_summary.md").write_text("\n".join(summary), encoding="utf-8")


if __name__ == "__main__":
    run()
