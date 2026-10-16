"use strict";
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
function checkProduction() {
  const failures=[];
  const config=fs.readFileSync(path.join(root,"netlify.toml"),"utf8");
  if(!/^\s*publish\s*=\s*"public"\s*$/m.test(config)) failures.push("Netlify publish must remain public");
  function walk(dir) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,entry.name), relative=path.relative(root,file);
      if(entry.isSymbolicLink()) {failures.push("Unexpected public symlink: "+relative);continue;}
      if(/visual[-_.]?lab|preview-bridge|defaults\.json|design-package|\.feiroo\.zip/i.test(entry.name)) failures.push("Lab artifact in production: "+relative);
      if(entry.isDirectory()) walk(file);
      else if(/\.(html|css|js|json)$/i.test(file)) {
        const source=fs.readFileSync(file,"utf8");
        if(/__visual-lab|feiroo\.visualLab|FeirooLab|Feiroo(?:Package|Drafts|StoragePanel|Lights|LightPanel|MultiLights|Background|Schema)|feiroo-light-guide|preview-bridge\.js|tools\/visual-lab/.test(source))
          failures.push("Lab reference in production: "+relative);
      }
    }
  }
  walk(path.join(root,"public"));
  if(failures.length) throw new Error(failures.join("\n"));
  return "PASS: public contains no Lab entry, bridge or local artifacts; Netlify publishes public.";
}
if(require.main===module) {try{console.log(checkProduction());}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={checkProduction};
