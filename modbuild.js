const http = require("http");
const fs = require("fs");
const cfg = require("./modbuild.json");
const path = require("path");

const pluginList = fs.readdirSync("./plugins/");
const plugins = [];
pluginList.forEach(p => {
    const plugin = require("./plugins/" + p + "/plugin.js");
    plugins.push(plugin);
    plugin.prepare(cfg);
});

const depFiles = [];

function build(entryPoint) {
    const rpt = path.join(cfg.src, entryPoint);
    return processJs(rpt);
}

function addDep(fpath) {
    if (!depFiles.includes(fpath)) {
        depFiles.push(fpath);
    } else {
        throw `File ${fpath} was included more than one time!`;
    }
}

function processJs(fpath) {
    addDep(fpath);
    let repl = fs.readFileSync(fpath, { encoding: "utf-8" });
    plugins.forEach(pl => {
        repl = pl.processJs(fpath, repl);
    });
    const jsmatch = repl.match(/\{ injectjs: "(.*?)" \}/g);
    if (jsmatch) {
        jsmatch.forEach(m => {
            const fn = m.substr(13, m.length - 16);
            const jsfile = processJs(path.join(cfg.src, fn));
            repl = repl.replace(m, jsfile);
        });
    }
    const cssmatch = repl.match(/\{ injectcss: "(.*?)" \}/g);
    if (cssmatch) {
        cssmatch.forEach(m => {
            const fn = m.substr(14, m.length - 17);
            const cssfile = processCss(path.join(cfg.src, fn)).replace(/`/g, "\\`");
            repl = repl.replace(m, "api.injectCss(`" + cssfile + "`);");
        });
    }
    return repl;
}

function processCss(fpath) {
    addDep(fpath);
    let repl = fs.readFileSync(fpath, { encoding: "utf-8" });
    plugins.forEach(pl => {
        repl = pl.processCss(fpath, repl);
    });
    const cssmatch = repl.match(/\{injectcss:"(.*?)"\}/g);
    if (cssmatch) {
        cssmatch.forEach(m => {
            const fn = m.substr(12, m.length - 14);
            const cssfile = processCss(path.join(cfg.src, fn)).replace(/`/g, "\\`");
            repl = repl.replace(m, cssfile);
        });
    }
    const b64match = repl.match(/\{base64:"(.*?)"\}/g);
    if (b64match) {
        b64match.forEach(m => {
            const bfn = m.substr(9, m.length - 11);
            let b64file = processFile(path.join(cfg.src, bfn));
            repl = repl.replace(m, b64file);
        });
    }
    return repl;
}

function processFile(fpath) {
    let buf = fs.readFileSync(fpath);
    plugins.forEach(pl => {
        buf = pl.processFile(fpath, buf);
    });
    return buf.toString("base64");
}

if (process.argv.length >= 3 && process.argv[2].toLowerCase() == "build") {
    let content = build(cfg.modfile).replace("[mb_init]", "");
    plugins.forEach(pl => {
        content = pl.postBuild(content, false);
    });
    fs.writeFileSync("./" + cfg.outfile, content, { encoding: "utf-8" });
    return;
}

http.createServer((request, response) => {
    if (request.url == "/mod.js") {
        const src = fs.readFileSync(path.join(cfg.src, cfg.modfile), { encoding: "utf-8" });
        let content = build(src).replace("[mb_init]", "window._root = root;");
        plugins.forEach(pl => {
            content = pl.postBuild(content, true);
        });
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET");
        response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
        response.setHeader("Access-Control-Allow-Credentials", true);
        response.writeHead(200, { "Content-Type": "application/javascript" });
        response.end(content, "utf-8");
    } else {
        response.writeHead(404, "Not Found", { "Content-type": "text/plain" });
        response.write("Not Found");
        response.end();
    }
}).listen(8000, () => {
    console.log("Live server started on port 8000");
});
