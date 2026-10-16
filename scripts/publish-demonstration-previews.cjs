const fs = require('node:fs');
const path = require('node:path');

// Validation is a hard gate before the first published byte changes. Backups cover IO failures too.
function publishValidatedSet({staging, destination, files, maps, validate}) {
    validate();
    const writes = [...files.map(file => [path.join(staging,file),path.join(destination,file)]),...maps];
    const expected=new Set(files);
    const obsolete=fs.existsSync(destination)?fs.readdirSync(destination).filter(file=>/\.(png|webm)$/.test(file)&&!expected.has(file)).map(file=>path.join(destination,file)):[];
    const previous = [...writes.map(([,target])=>target),...obsolete].map(target => [target,fs.existsSync(target)?fs.readFileSync(target):undefined]);
    try {
        fs.mkdirSync(destination,{recursive:true});
        for(const [source,target] of writes)fs.copyFileSync(source,target);
        for(const file of obsolete)fs.unlinkSync(file);
    } catch(error) {
        for(const [target,data] of previous){if(data===undefined){if(fs.existsSync(target))fs.unlinkSync(target);}else fs.writeFileSync(target,data);}
        throw error;
    }
}
module.exports={publishValidatedSet};
