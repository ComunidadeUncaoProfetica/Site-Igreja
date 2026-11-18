"use strict";
(() => {
const config = window.IGREJA_CONFIG || {};
const msg = document.getElementById("mensagem");
let token = null;
function ready() {
 if (!config.url || !/^https:\/\/[^/]+\.supabase\.co$/.test(config.url) || !config.key || config.key.includes("COLE_")) throw Error("Cadastro ainda não ativado. A administração precisa configurar o serviço.");
}
async function api(path, method="GET", body) {
 ready();
 const headers={apikey:config.key,"Content-Type":"application/json"};
 if(token) headers.Authorization="Bearer "+token;
 const response=await fetch(config.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok) {
  if(response.status===401) {token=null;document.getElementById("painel")?.setAttribute("hidden","");document.getElementById("login-form")?.removeAttribute("hidden");}
  throw Error("Não foi possível concluir. Confira os dados, a conexão e suas permissões e tente novamente.");
 }
 const text=await response.text();return text?JSON.parse(text):null;
}
async function action(button,fn) {button.disabled=true;msg.textContent="Aguarde…";try{await fn();}catch(e){msg.textContent=e.message;}finally{button.disabled=false;}}
const form=document.getElementById("visita-form");
form?.addEventListener("submit",e=>{e.preventDefault();action(form.querySelector("button"),async()=>{
 const data=new FormData(form),nome=data.get("nome").trim(),telefone=data.get("telefone").replace(/[^0-9]/g,"");
 if(nome.length<2||telefone.length<10||telefone.length>15) throw Error("Informe seu nome e um telefone válido com DDD.");
 await api("/rest/v1/visitas","POST",{nome,telefone,cargo:data.get("cargo"),consentimento:data.get("consentimento")==="on",autoriza_contato:data.get("contato")==="on"});
 form.reset();msg.textContent="Cadastro recebido! Sua presença será confirmada pela igreja. Você pode continuar navegando.";
});});
const login=document.getElementById("login-form"),panel=document.getElementById("painel");
async function list() {
 const rows=await api("/rest/v1/visitas?select=id,nome,telefone,cargo,criado_em,autoriza_contato,situacao&order=criado_em.desc&limit=500");
 const tbody=document.getElementById("registros");tbody.replaceChildren();
 for(const row of rows){const tr=document.createElement("tr");for(const value of [row.nome,row.telefone,row.cargo,new Date(row.criado_em).toLocaleString("pt-BR"),row.autoriza_contato?"Sim":"Não"]){const td=document.createElement("td");td.textContent=value;tr.append(td);}
 const td=document.createElement("td"),select=document.createElement("select");select.setAttribute("aria-label","Situação da visita de "+row.nome);
 for(const value of ["Visita prevista","Visita realizada"]){const option=document.createElement("option");option.value=value;option.textContent=value;select.append(option);}select.value=row.situacao;
 const save=document.createElement("button");save.textContent="Salvar";save.onclick=()=>action(save,async()=>{await api("/rest/v1/visitas?id=eq."+encodeURIComponent(row.id),"PATCH",{situacao:select.value});msg.textContent="Situação salva.";});td.append(select,save);tr.append(td);
 const cell=document.createElement("td"),del=document.createElement("button");del.textContent="Excluir";del.onclick=()=>{if(confirm("Excluir definitivamente o cadastro de "+row.nome+"?"))action(del,async()=>{await api("/rest/v1/visitas?id=eq."+encodeURIComponent(row.id),"DELETE");await list();msg.textContent="Cadastro excluído.";});};cell.append(del);tr.append(cell);tbody.append(tr);}
 msg.textContent=rows.length?rows.length+" cadastro(s) carregado(s).":"Nenhum cadastro encontrado.";
}
login?.addEventListener("submit",e=>{e.preventDefault();action(login.querySelector("button"),async()=>{
 const data=new FormData(login);const result=await api("/auth/v1/token?grant_type=password","POST",{email:data.get("email").trim(),password:data.get("password")});token=result.access_token;login.reset();
 const admins=await api("/rest/v1/administradores?select=user_id&limit=1");if(!admins.length){token=null;throw Error("Esta conta não tem autorização administrativa.");}
 await list();login.hidden=true;panel.hidden=false;
});});
document.getElementById("atualizar")?.addEventListener("click",e=>action(e.target,list));
document.getElementById("sair")?.addEventListener("click",()=>{token=null;panel.hidden=true;login.hidden=false;document.getElementById("registros").replaceChildren();msg.textContent="Você saiu.";});
})();
