const http = require("http");
const fs = require("fs");
const cfg = require("./modbuild.json");
const path = require("path");

function build(cont) {
    var repl = cont;
    const cssmatch = repl.match(/\{ injectcss: "(.*?)" \}/g);
    if (cssmatch) {
        cssmatch.forEach(m => {
            const fn = m.substr(14, m.length - 17);
            let cssfile = fs.readFileSync(path.join(cfg.src, fn), { encoding: "utf-8" })
                .replace(/`/g, "\\`");
            const cssb64match = cssfile.match(/\{base64:"(.*?)"\}/g);
            if (cssb64match) {
                cssb64match.forEach(bm => {
                    const bfn = bm.substr(9, bm.length - 11);
                    let b64file = fs.readFileSync(path.join(cfg.src, bfn)).toString("base64");
                    cssfile = cssfile.replace(bm, b64file);
                });
            }
            repl = repl.replace(m, "api.injectCss(`" + cssfile + "`);");
        });
    }
    return repl;
}

if (process.argv.length >= 3 && process.argv[2].toLowerCase() == "build") {
    let content = fs.readFileSync(path.join(cfg.src, cfg.modfile), { encoding: "utf-8" });
    content = build(content).replace("[mb_init]", "");
    fs.writeFileSync("./" + cfg.outfile, content, { encoding: "utf-8" });
    return;
}

http.createServer((request, response) => {
    if (request.url == "/mod.js") {
        const src = fs.readFileSync(path.join(cfg.src, cfg.modfile), { encoding: "utf-8" });
        const content = build(src).replace("[mb_init]", "window._root = root;");
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
