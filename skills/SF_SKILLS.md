# Salesforce Development Skills

The Buildify integrates with [sf-skills](https://github.com/Jaganpro/sf-skills) — a community-built skill library that teaches AI agents Salesforce development best practices, patterns, and validation rules.

## What sf-skills Provides

Unlike MCP tools (which execute actions), sf-skills are **knowledge files** (SKILL.md) that guide your AI agent on *how* to write quality Salesforce code. They include scoring rubrics, validation hooks, and LSP integration.

## Included Skills (33)

### Development
- **sf-apex** — Apex development (triggers, classes, batch jobs, scoring + Code Analyzer)
- **sf-flow** — Flow development (screen, record-triggered, scheduled; scoring + Flow Scanner)
- **sf-lwc** — Lightning Web Components (datatables, forms, Jest tests, LMS)
- **sf-soql** — SOQL query development and optimization

### Quality
- **sf-testing** — Apex test execution, coverage analysis, bulk test generation
- **sf-debug** — Debug log analysis, governor limits, performance troubleshooting

### Foundation
- **sf-metadata** — Metadata generation: objects, fields, validation rules, permission sets
- **sf-data** — Data operations: queries, bulk inserts, test data, CSV imports
- **sf-docs** — Official Salesforce documentation retrieval
- **sf-permissions** — Permission and access analysis

### Integration
- **sf-connected-apps** — Connected Apps, OAuth/JWT Bearer/PKCE configuration
- **sf-integration** — Named Credentials, callouts, platform events, External Services

### Data Cloud
- **sf-datacloud** — Overview and orchestration
- **sf-datacloud-connect** — Connections and ingestion
- **sf-datacloud-prepare** — Data preparation
- **sf-datacloud-harmonize** — Harmonization (DMOs, identity resolution)
- **sf-datacloud-segment** — Segmentation
- **sf-datacloud-act** — Activation
- **sf-datacloud-retrieve** — Data retrieval

### AI & Automation
- **sf-ai-agentscript** — Agent Script authoring with ASV-rule checks
- **sf-ai-agentforce** — Agentforce design, configuration, deployment
- **sf-ai-agentforce-testing** — Agentforce testing (scoring + fix loops)
- **sf-ai-agentforce-observability** — Agentforce monitoring
- **sf-ai-agentforce-persona** — Persona design and conversation UX

### DevOps & Tooling
- **sf-deploy** — Deployment automation across Apex, Flow, LWC, metadata
- **sf-diagram-mermaid** — Mermaid diagram generation
- **sf-diagram-nanobananapro** — Visual artifact generation

### Industries / OmniStudio
- **sf-industry-commoncore-omnistudio-analyze** — OmniStudio dependency analysis
- **sf-industry-commoncore-datamapper** — Data Mappers
- **sf-industry-commoncore-integration-procedure** — Integration Procedures
- **sf-industry-commoncore-callable-apex** — Callable Apex
- **sf-industry-commoncore-omniscript** — OmniScripts
- **sf-industry-commoncore-flexcard** — FlexCards

## How They Work Together

| Need | Tool |
|------|------|
| Deploy Apex to an org | Buildify MCP `sf_deploy` tool |
| Write *good* Apex that follows best practices | sf-skills `sf-apex` knowledge |
| Create an Agentforce agent file | ADLC `/adlc-author` skill |
| Test Agentforce agent behavior | ADLC `/adlc-test` + sf-skills `sf-ai-agentforce-testing` |
| Build a Lightning Web Component | sf-skills `sf-lwc` knowledge |
| Query data from an org | Buildify MCP `sf_query` tool |
| Write optimized SOQL | sf-skills `sf-soql` knowledge |

## Manual Installation

If sf-skills weren't installed during setup:

```bash
npx skills add Jaganpro/sf-skills
```

Or install a single skill:

```bash
npx skills add Jaganpro/sf-skills --skill sf-apex
```
