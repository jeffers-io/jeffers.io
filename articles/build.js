const chalk = require("chalk");
const fs = require("fs").promises;
const path = require("path");

const marked = require("marked");

const htmlFileName = f => f.replace(/\.md$/, ".html");

const findMds = async (dirPath, mds) => {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  return Promise.all(
    dirents.map(async x => {
      if (x.isDirectory()) {
        await findMds(path.join(dirPath, x.name), mds);
      } else if (path.extname(x.name) === ".md") {
        mds.push(path.join(dirPath, x.name));
      }
    })
  );
};

async function build() {
  const template = await fs.readFile("index.html", "utf8");
  const templateStat = await fs.stat("index.html");

  const mds = [];
  await findMds(".", mds);

  const mdsToProcess = [];
  console.log();
  await Promise.all(
    mds.map(async f => {
      let htmlStat;
      try {
        htmlStat = await fs.stat(htmlFileName(f));
      } catch (_) {
        console.log(chalk.magenta(`No HTML file for ${f}\n`));
        mdsToProcess.push(f);
        return;
      }
      const mdStat = await fs.stat(f);
      if (
        mdStat.mtime > htmlStat.mtime ||
        templateStat.mtime > htmlStat.mtime
      ) {
        console.log(chalk.magenta(`${f} out of date\n`));
        mdsToProcess.push(f);
      }
    })
  );

  console.log(
    chalk.yellow(
      `Found ${mdsToProcess.length} markdown file(s) to process...\n`
    )
  );
  if (mdsToProcess.length) console.log(mdsToProcess.join("\n"));

  await Promise.all(
    mdsToProcess.map(async f => {
      const md = await fs.readFile(f, "utf8");
      const html = marked(md);
      const page = template.replace("{{body}}", html);
      await fs.writeFile(htmlFileName(f), page);
      console.log(chalk.green(`\nWrote ${htmlFileName(f)}`));
    })
  );
  console.log("Done.\n");
}

build();
