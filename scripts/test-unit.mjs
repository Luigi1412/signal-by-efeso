import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const tests=readdirSync('src',{recursive:true}).filter(file=>typeof file==='string'&&file.endsWith('.test.ts')).map(file=>`src/${file}`);
const result=spawnSync(process.execPath,['--import','tsx','--test',...tests],{stdio:'inherit'});
process.exit(result.status??1);
