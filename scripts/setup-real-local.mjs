import {readFile,writeFile} from 'node:fs/promises';
try {
 await writeFile('.env.local',await readFile('config/real-local.env.template'),{flag:'wx',mode:0o600});
 console.log('.env.local criado com permissões restritas, sem chaves ou senhas. Preencha as credenciais nesse arquivo privado, nunca no chat ou no Git.');
} catch(error) {
 if(error.code==='EEXIST')console.log('.env.local já existe e foi preservado. Nenhuma configuração foi sobrescrita.');
 else{console.error('Não foi possível criar a configuração local.');process.exitCode=1;}
}
