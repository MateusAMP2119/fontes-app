import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chromium } from 'playwright'
const origin = process.env.TEST_ORIGIN || 'http://localhost:5173'
test('verified authentication, confirmed sync and offline recovery', async () => {
 const browser=await chromium.launch(); const page=await browser.newPage(); let authenticated=false,offline=false; const writes=[],errors=[];
 const user={id:'test-user',email:'mateus@example.com',emailVerified:true,name:'Mateus',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 let state={organization:null,project:null,profile:{name:'Mateus'},revision:0,completed:false,changelog:false,daily:false};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/get-session')) return route.fulfill({json:authenticated?{user,session:{id:'session',token:'test',userId:user.id,expiresAt:new Date(Date.now()+3600000).toISOString(),createdAt:user.createdAt,updatedAt:user.updatedAt}}:null});
  if(path.endsWith('/send-verification-otp')) return route.fulfill({json:{success:true}});
  if(path.endsWith('/sign-in/email-otp')){await new Promise(r=>setTimeout(r,700));authenticated=true;return route.fulfill({json:{user,token:'test'}})}
  if(path==='/api/onboarding'){
   assert.ok(authenticated);
   if(route.request().method()==='GET') return route.fulfill({json:state});
   if(offline)return route.fulfill({status:503,json:{message:'offline'}});
   const b=route.request().postDataJSON();writes.push(b);state={...state,organization:{id:'org',name:b.name,slug:b.slug},project:{id:'project',name:'O meu projeto',organizationId:'org',createdAt:user.createdAt},revision:b.revision,completed:b.completed};return route.fulfill({json:state});
  }
  return route.fulfill({json:{}});
 });
 try{
  await page.goto(origin);const button=name=>page.getByRole('button',{name,exact:true});const input=name=>page.getByRole('textbox',{name,exact:true});
  assert.equal(await page.getByRole('navigation',{name:'Ecrãs'}).count(),0);
  await button('Continuar com email').click();await input('Endereço de email').fill(user.email);await button('Continuar com email').click();await input('Código de confirmação').fill('123456');await button('Continuar com código').click();await input('Nome').waitFor();assert.equal(authenticated,false);assert.equal(writes.length,0);
  await input('Nome').fill('Fontes Editorial');await button('Criar ambiente').click();await input('Nome do perfil').fill('Mateus Costa');await button('Criar perfil').click();await button('Saltar').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fontes:onboarding:v1:test-user')||'null')?.revision>0);
  offline=true;await button('Começar').click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.make-shell').count(),0);await page.reload();await page.locator('.ob-updates').waitFor();offline=false;await page.evaluate(()=>dispatchEvent(new Event('online')));await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('fontes:onboarding:v1:test-user')||'null')?.pending);await page.locator('.make-shell').waitFor();
  assert.ok(writes.at(-1).completed);assert.equal(writes.at(-1).name,'Fontes Editorial');assert.equal(writes.at(-1).profileName,'Mateus Costa');assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('123456'));assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
