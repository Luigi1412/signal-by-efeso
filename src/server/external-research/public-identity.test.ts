import assert from 'node:assert/strict';
import test from 'node:test';
import { identityFromHtml, discoverPublicIdentity } from './public-identity';
const document=(name='Northstar Industrial',url='https://northstar.example')=>`<script type="application/ld+json">${JSON.stringify({'@type':'Corporation',name,legalName:name+' PLC',url,address:{addressCountry:'GB'},brand:{name:'OpticBrand'},parentOrganization:{name:'Parent Holdings'}})}</script>`;
test('unregistered company identity comes from its own public organization record',()=>{
 const result=identityFromHtml('Northstar Industrial','https://northstar.example/',document());
 assert.equal(result.length,1);assert.equal(result[0]?.headquartersCountry,'GB');assert.equal(result[0]?.parent?.name,'Parent Holdings');assert.equal(result[0]?.entityKind,'subsidiary');
 assert.equal(identityFromHtml('Unrelated','https://northstar.example/',document()).length,0);
 assert.equal(identityFromHtml('Northstar Industrial','https://evil.example/',document()).length,0);
});
test('brand relationship is explicit and never becomes corporate country/research scope',()=>{
 const result=identityFromHtml('OpticBrand','https://northstar.example/',document());
 assert.equal(result[0]?.relationshipToQuery,'brand_of');assert.equal(result[0]?.headquartersCountry,'GB');
});
test('public lookup returns ambiguity and never substitutes a catalog/demo fallback',async()=>{
 const provider={name:'test-fixture',search:async()=>[{url:'https://one.example/',title:'Northstar Industrial',publisher:'one',sourceType:'official_page' as const,sourceTier:1 as const,publishedAt:null},{url:'https://two.example/',title:'Northstar Industrial',publisher:'two',sourceType:'official_page' as const,sourceTier:1 as const,publishedAt:null}],fetchPage:async()=>{throw Error('unused');},fetchDocument:async(url:string)=>({url,finalUrl:url,bytes:new TextEncoder().encode(document('Northstar Industrial',url)),mimeType:'text/html',title:null})};
 const result=await discoverPublicIdentity({query:'Northstar Industrial',provider});assert.equal(result.kind,'ambiguous');
 const missing=await discoverPublicIdentity({query:'No public company',provider:{...provider,search:async()=>[]}});assert.deepEqual(missing,{kind:'unresolved',suggestions:[]});
});
