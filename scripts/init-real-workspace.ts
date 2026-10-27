import {existsSync} from "node:fs";
import {loadEnvFile} from "node:process";
import {createClient} from "@supabase/supabase-js";
for(const path of [".env.local",".env"])if(existsSync(path))loadEnvFile(path);
async function main(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error("Configure Supabase no .env.local.");
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from("workspaces").select("id,status").eq("slug","efeso-brazil").maybeSingle();
 if(error)throw Error("Não foi possível verificar o workspace.");
 if(data){console.log("Workspace existente preservado; nenhuma configuração ou status foi alterado.");return;}
 const created=await admin.from("workspaces").insert({name:"EFESO Brazil",slug:"efeso-brazil",country_code:"BR",default_ui_locale:"pt-BR",default_report_locale:"pt-BR",status:"active"});
 if(created.error)throw Error("Não foi possível criar o workspace.");
 console.log("Workspace real criado. Nenhuma empresa, fixture, usuário ou pesquisa foi inserido.");
}
main().catch(()=>{console.error("Inicialização indisponível. Verifique Supabase e migrations; nada foi resetado.");process.exitCode=1;});
