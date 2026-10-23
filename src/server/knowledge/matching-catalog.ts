import "server-only";
import { cache } from "react";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { researchRuntime } from "@/server/external-research/runtime";
import { memberSafeKnowledge } from "./member-safety";
import { listActiveKnowledgeObjects } from "./persistence";
import type { KnowledgeFitTarget } from "@/server/intelligence/types";

const loadCatalog=cache(async (workspaceId:string):Promise<KnowledgeFitTarget[]>=>{
  const objects=(await listActiveKnowledgeObjects(workspaceId)).filter(o=>memberSafeKnowledge(o)&&o.approved_for_matching===true);
  if(objects.length===0) return [];
  const db=createPipelineAdminClient();const ids=objects.map(o=>o.id);
  const [tags,relations]=await Promise.all([
    db.from("knowledge_object_tags").select("knowledge_object_id,tag_id,knowledge_tags(category,canonical_name)").eq("workspace_id",workspaceId).in("knowledge_object_id",ids),
    db.from("knowledge_object_relations").select("source_object_id,target_object_id,relation_type").eq("workspace_id",workspaceId),
  ]);
  if(tags.error) throw tags.error;if(relations.error) throw relations.error;
  const safeIds=new Set(ids);
  return objects.map(o=>({id:o.id,objectType:o.object_type,canonicalName:o.canonical_name,status:o.status,shortDescription:o.short_description,
    visibilityLevel:o.visibility_level!,confidentialityLevel:o.confidentiality_level!,knowledgeNature:o.knowledge_nature!,outcomeStatus:o.outcome_status!,
    approvedForMatching:true,origin:typeof o.metadata.origin==="string"?o.metadata.origin:null,
    tags:(tags.data??[]).filter(t=>t.knowledge_object_id===o.id).flatMap(t=>{
      const tag=Array.isArray(t.knowledge_tags)?t.knowledge_tags[0]:t.knowledge_tags;
      return tag?[{tagId:String(t.tag_id),category:tag.category,canonicalName:tag.canonical_name}]:[];
    }),
    relatedObjects:(relations.data??[]).filter(r=>(r.source_object_id===o.id||r.target_object_id===o.id)&&safeIds.has(r.source_object_id)&&safeIds.has(r.target_object_id)).map(r=>{
      const target=objects.find(t=>t.id===(r.source_object_id===o.id?r.target_object_id:r.source_object_id))!;
      return {id:target.id,objectType:target.object_type,canonicalName:target.canonical_name,relationType:String(r.relation_type)};
    }),
  }));
});
export async function loadMatchingCatalog(workspaceId:string):Promise<KnowledgeFitTarget[]> {
  const runtime=researchRuntime.getStore();
  if(!runtime) return loadCatalog(workspaceId);
  const key=`knowledge:${workspaceId}`;
  let pending=runtime.memo.get(key) as Promise<KnowledgeFitTarget[]>|undefined;
  if(!pending) {pending=loadCatalog(workspaceId);runtime.memo.set(key,pending);}
  return pending;
}
