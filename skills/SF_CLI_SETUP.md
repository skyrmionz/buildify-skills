# Salesforce CLI Setup

The Buildify's MCP server includes Salesforce CLI tools that let the agent interact with your Salesforce org directly.

## Prerequisites

Install the Salesforce CLI:
```bash
npm install -g @salesforce/cli
```

## Authentication

Authenticate to your org:
```bash
# Web login (opens browser)
sf org login web --alias my-org

# JWT login (for CI/automated environments)
sf org login jwt --client-id <id> --jwt-key-file <path> --username <user> --alias my-org
```

## Setting Default Org

```bash
sf config set target-org my-org
```

## Available MCP Tools

Once authenticated, the agent can use these tools:

- `sf_list_orgs()` — See all authenticated orgs
- `sf_get_org_info(alias?)` — Get org URL, username, instance details
- `sf_query(soql, alias?)` — Run SOQL queries
- `sf_run_apex(code, alias?)` — Execute anonymous Apex
- `sf_deploy(sourcePath, alias?)` — Deploy metadata
- `sf_retrieve(metadata, alias?)` — Retrieve metadata
- `sf_describe_object(sobject, alias?)` — Describe object schema

All tools accept an optional `alias` parameter. If omitted, they use the default target org.
