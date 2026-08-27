import { readFileSync, writeFileSync } from "node:fs";

const USERNAME = "AndreNonatoFigueiredo";
const START_MARKER = "<!-- FEATURED-PROJECTS:START -->";
const END_MARKER = "<!-- FEATURED-PROJECTS:END -->";

const query = `
  query ($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes {
          ... on Repository {
            name
            description
            url
            homepageUrl
            primaryLanguage { name }
          }
        }
      }
    }
  }
`;

const token = process.env.GH_TOKEN;
if (!token) {
  console.error("GH_TOKEN environment variable is required");
  process.exit(1);
}

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, variables: { login: USERNAME } }),
});

const { data, errors } = await response.json();
if (errors) {
  console.error(JSON.stringify(errors, null, 2));
  process.exit(1);
}

const repos = data.user.pinnedItems.nodes;

const rows = repos.length
  ? repos.map((repo) => {
      const description = repo.description ?? "_No description yet._";
      const language = repo.primaryLanguage ? ` \`${repo.primaryLanguage.name}\`` : "";
      const demo = repo.homepageUrl ? ` · [Live demo](${repo.homepageUrl})` : "";
      return `| [**${repo.name}**](${repo.url}) | ${description}${language}${demo} |`;
    })
  : [
      "| _No repositories pinned yet — pin your best repos on your GitHub profile to feature them here._ | |",
    ];

const table = ["| Project | Description |", "|---|---|", ...rows].join("\n");
const block = `${START_MARKER}\n${table}\n${END_MARKER}`;

const readme = readFileSync("README.md", "utf8");
const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);

if (!pattern.test(readme)) {
  console.error("Could not find featured projects markers in README.md");
  process.exit(1);
}

const updated = readme.replace(pattern, block);
writeFileSync("README.md", updated);
console.log(`Synced ${repos.length} pinned repositor${repos.length === 1 ? "y" : "ies"} into README.md`);
