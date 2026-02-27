# Citations

## Primary Inspiration And Method Anchor

- Paper:
  - https://arxiv.org/abs/2411.10109
  - https://arxiv.org/pdf/2411.10109
- Open-source reference implementation:
  - https://github.com/StanfordHCI/genagents

## Evidence Labeling Note

- Paper-backed empirical anchors should be attributed to the paper, not to this project.
- Repo structure and implementation patterns should be attributed to the `genagents` codebase, not to the paper's exact evaluation setup.
- Project defaults that are operational placeholders for later calibration should be treated as project estimates, even when they are paper-inspired.

## Federal/National Benchmark Sources Used

- NSDUH Reliability Study chapters:
  - https://www.ncbi.nlm.nih.gov/books/NBK519788/
  - https://www.ncbi.nlm.nih.gov/books/NBK519791/
  - https://pubmed.ncbi.nlm.nih.gov/30199182/
- BRFSS reliability references:
  - https://pubmed.ncbi.nlm.nih.gov/12700216/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC1732444/
- HINTS test-retest reference:
  - https://doi.org/10.1089/jpm.2015.0501
- GSS contextual panel references:
  - https://gss.norc.org/content/dam/gss/get-documentation/pdf/codebook/Panel%20Codebook.pdf
  - https://sociologicalscience.com/articles-v3-43-971/

## Important Comparability Note

The app enforces strict comparator filtering for benchmark thresholding by default
(`near_2week` + `federal_national_representative`). Non-strict comparators are
shown for context but not used in strict threshold calibration.




