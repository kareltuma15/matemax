@AGENTS.md

## MS Dashboard
Projektový kokpit je MS Dashboard (MCP server „ms-dashboard“).
- Na začátku session zavolej get_context – hlavně fakta (ceny, plány, termíny) a otevřené úkoly projektu MateMax.
- Texty v appce (ceny, počty, termíny) ber z get_facts, ne z paměti. Změnu faktu navrhni přes propose_fact_change.
- Úkoly MateMaxu: dokončené označ update_task_status, nové zakládej add_task s popisem a odhadem hodin.
- Na konci session zapiš hlášení přes create_report: co je hotovo, co zbývá, co musí rozhodnout Karel (conflicts).
- Nic, co se dotkne zákazníků (e-maily, ceny, veřejný web), nespouštěj bez propose_change.
