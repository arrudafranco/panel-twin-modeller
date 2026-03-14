# External Reference Defaults

Date last updated: 2026-03-13

External sources used to ground model defaults, validate assumptions, and calibrate benchmarks. These are planning-level anchors; prefer pilot-calibrated parameters over generic defaults wherever real field data exist.

## Quality anchors

**Park et al. (2024) — primary quality anchor**
- Agents built from ~2-hour qualitative interviews replicate participants' GSS Core survey responses with 85% normalized accuracy relative to participants' own 2-week test-retest consistency.
- Economic game experiments: 0.66 normalized accuracy.
- Sample: 1,052 participants. Instrument: full GSS Core (177 items spanning attitudes, self-reported behaviors, opinions, and demographics).
- arXiv:2411.10109 (preprint, pre-registered at osf.io/mexkf/). https://arxiv.org/abs/2411.10109

## Federal survey benchmarks (Benchmarks tab)

**NSDUH Reliability Study (SAMHSA, 2010)**
- Full title: *Reliability of Key Measures in the National Survey on Drug Use and Health*. SAMHSA, Rockville, MD.
- Reports test-retest kappa coefficients for substance use behavior (lifetime and past-year use), perceived risk/availability, demographics, and mental health items from the 2006 NSDUH. Lifetime use kappas mostly ≥0.80; past-year use kappas frequently ≥0.80; perceived risk items generally below 0.60.
- Used as a federal comparator in the Benchmarks tab.
- https://www.ncbi.nlm.nih.gov/books/NBK519788/

**BRFSS HRQOL Reliability Reinterview (Andresen et al., 2003)**
- Full citation: Andresen, E. M., Catlin, T. K., Wyrwich, K. W., & Jackson-Thompson, J. (2003). Retest reliability of surveillance questions on health-related quality of life. *Journal of Epidemiology & Community Health*, 57(5), 339–343.
- Reports test-retest reliability for four BRFSS health-related quality-of-life questions. Self-reported health and healthy days measures showed excellent reliability (≥0.75); other measures showed moderate reliability (0.58–0.71).
- Used as an additional federal comparator in the Benchmarks tab.
- https://pubmed.ncbi.nlm.nih.gov/12700216/

## Survey response rate context

**Pew Research Center methodology note**
- Contemporary telephone surveys face declining response rates; nonresponse adjustment and weighting remain standard practice.
- https://www.pewresearch.org/methods/2017/05/15/what-low-response-rates-mean-for-telephone-surveys/

## Token estimation

**OpenAI tokenizer guidance**
- A common English approximation: ~1 token per 4 characters, used for rough LLM cost planning.
- https://platform.openai.com/tokenizer
