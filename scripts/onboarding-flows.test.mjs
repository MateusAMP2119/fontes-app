import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, webkit } from 'playwright'
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5183'
const user = { id:'flow-user',email:'person@example.com',name:'Pessoa',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() }
const blank = () => ({organization:null,project:null,profile:{name:'Pessoa'},revision:0,completed:false,changelog:false,daily:false,passwordRequired:false,canInvite:true,canEditWorkspace:true})
const workspace = () => ({...blank(),organization:{id:'org',name:'Equipa',slug:'equipa'},project:{id:'project',organizationId:'org',name:'Projeto',createdAt:user.createdAt}})
// API-failure simulations need route interception. WebKit service-worker fetches bypass
// Playwright routing; service-worker behavior is verified separately in pwa.test.mjs.
async function fixture(t, options={}) {
 const user=options.user||{ id:'flow-user',email:'person@example.com',name:'Pessoa',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };const browser=await (process.env.TEST_BROWSER === 'webkit' ? webkit : chromium).launch();t.after(()=>browser.close());const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(7000)
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);if(process.env.DEBUG_TEST)console.log(e.stack)});t.after(()=>assert.deepEqual(errors,[]))
 const f={page,state:options.state||blank(),authenticated:options.authenticated??true,writes:[],calls:[],offline:false,joins:0,failInvite:false}
 await page.context().route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,b=req.method()==='POST'?req.postDataJSON():undefined
  f.calls.push({path,body:b})
  if(path.endsWith('/get-session'))return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:f.authenticated?{user,session:{id:'session',userId:user.id,createdAt:user.createdAt,expiresAt:new Date(Date.now()+3600000).toISOString()}}:null})
  if(path.endsWith('/send-verification-otp'))return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{success:true}})
  if(path.endsWith('/sign-in/email-otp')||path.endsWith('/sign-in/email')){f.authenticated=true;return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{user,token:'test'}})}
  if(path.endsWith('/sign-out')){f.authenticated=false;return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{success:true}})}
  if(path==='/api/onboarding/password'){assert.equal(f.authenticated,true);assert.ok(b.newPassword.length>=8);f.state.passwordRequired=false;return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:f.state})}
  if(path==='/api/onboarding/invitation')return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{name:'Equipa convidada',role:'member'}})
  if(path==='/api/onboarding/join'){f.joins++;f.state={...workspace(),project:null,canInvite:false,canEditWorkspace:false};return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:f.state})}
  if(path==='/api/onboarding/invite'){
   if(f.failInvite&&b.email==='bad@example.com')return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:403,json:{message:'Convite recusado.'}})
   return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{ready:true}})
  }
  if(path==='/api/onboarding'){
   if(!b)return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:f.state})
   f.writes.push(b)
   if (!b.name?.trim() || !/^[a-z0-9][a-z0-9-]{2,47}$/.test(b.slug || '') || !b.profileName?.trim()) return route.fulfill({status:400,json:{message:'Nome, URL ou perfil inválido.',step:'workspace'}})
   if(f.offline&&b.completed)return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:503,json:{message:'Indisponível.'}})
   f.state={...f.state,organization:f.state.organization||workspace().organization,project:workspace().project,profile:{name:b.profileName,image:b.profileImage},revision:b.revision,operationId:b.operationId,completed:b.completed,changelog:b.changelog,daily:b.daily}
   return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:f.state})
  }
  if(path.endsWith('/reset-password')||path.endsWith('/request-password-reset')||path.endsWith('/change-password'))return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{status:true}})
  return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{}})
 })
 f.button=name=>page.getByRole('button',{name,exact:true})
 f.input=name=>page.getByRole('textbox',{name,exact:true})
 return f
}
test('new email account requires password; confirmed setup opens while final preferences retry across reload',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 await p.goto(origin)
 await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Continuar com código').click()
 await p.getByRole('heading',{name:'Definir palavra-passe',exact:true}).waitFor()
 await p.locator('input[autocomplete="new-password"]').fill('test-secret-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Equipa');await f.button('Criar ambiente').click()
 await f.input('Nome do perfil').fill('Pessoa final');await f.button('Continuar').click();await f.button('Saltar').click()
 await assertEventually(()=>f.state.profile.name==='Pessoa final')
 f.offline=true;await f.button('Começar').click();await p.locator('.make-shell').waitFor();await p.getByRole('status').filter({hasText:'Indisponível'}).waitFor()
 assert.equal(f.state.completed,false,'server completion is never fabricated')
 await p.reload();await p.locator('.make-shell').waitFor()
 f.offline=false;await p.evaluate(()=>dispatchEvent(new Event('online')));await assertEventually(()=>f.state.completed)
 assert.equal(f.state.completed,true);assert.equal(f.state.profile.name,'Pessoa final')
 const storage=await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))
 assert.ok(!storage.includes('test-secret-password'));assert.ok(!storage.includes('123456'))
 const confirmedWrites=f.writes.length
 await p.reload();await p.locator('.make-shell').waitFor()
 await f.button('Abrir menu da conta').click();await p.getByRole('menuitem',{name:'Terminar sessão'}).click()
 await f.button('Entrar').click();await f.input('Endereço de email').fill(user.email)
 await p.locator('input[autocomplete="current-password"]').fill('test-secret-password');await f.button('Iniciar sessão').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.writes.length,confirmedWrites,'confirmed completion restores without another setup save')
})
test('invitation automatically joins and skips owner setup and owner-only back/invites',async t=>{
 const f=await fixture(t),p=f.page;await p.goto(origin+'/?invite='+'ab'.repeat(32))
 await p.locator('.ob-profile').waitFor()
 assert.equal(await p.locator('.ob-join').count(),0)
 assert.equal(await f.button('Voltar').count(),0);assert.equal(await p.locator('.ob-workspace').count(),0)
 assert.equal(await f.button('Ambiente').isDisabled(),true);assert.equal(await f.button('Convites').isDisabled(),true)
 await f.button('Continuar').click();await p.locator('.ob-updates').waitFor();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.joins,1);assert.ok(!p.url().includes('invite='))
})
test('invitation waits for a required password before joining', async t => {
 const f = await fixture(t, { state: { ...blank(), passwordRequired:true } }), p = f.page
 await p.goto(origin+'/?invite='+'ab'.repeat(32))
 await p.locator('.ob-password').waitFor()
 assert.equal(f.joins, 0)
 await p.locator('input[autocomplete="new-password"]').fill('invite-password-456')
 await f.button('Guardar palavra-passe').click()
 await p.locator('.ob-profile').waitFor()
 assert.equal(f.joins, 1)
 assert.equal(await p.locator('.ob-join').count(), 0)
})
test('invalid invitation keeps its token and allows retry without opening the app', async t => {
 const f = await fixture(t), p = f.page
 await p.route('**/api/onboarding/join', route => route.fulfill({status:400,json:{message:'Convite inválido.'}}))
 await p.goto(origin+'/?invite='+'ab'.repeat(32))
 await p.getByText('Convite inválido.', {exact:true}).waitFor()
 assert.ok(p.url().includes('invite='))
 assert.equal(await p.locator('.make-shell').count(), 0)
 await p.unroute('**/api/onboarding/join')
 await f.button('Tentar ligação novamente').click()
 await p.locator('.ob-profile').waitFor()
 assert.equal(f.joins, 1)
})
test('an invited member reload repairs an empty workspace snapshot without losing profile edits', async t => {
 const state = { ...workspace(), project:null, canInvite:false, canEditWorkspace:false }
 const f = await fixture(t, { state }), p = f.page
 await p.addInitScript(({ user }) => {
  localStorage.setItem('fontes:onboarding:v1:' + user.id, JSON.stringify({
   draft:{ step:'updates', email:user.email, name:'', slug:'', profile:'Edited member', image:'', changelog:true, daily:false },
   revision:0, invitations:[], completionRequested:true,
   pending:{ organizationId:'org', operationId:'stuck-invitation-save', revision:1, name:'', slug:'', profileName:'Edited member', profileImage:'', completed:true, workspace:false, changelog:true, daily:false }
  }))
 }, { user })
 await p.goto(origin)
 await p.locator('.make-shell').waitFor()
 assert.ok(f.writes.length > 0)
 assert.ok(f.writes.every(write => write.name === 'Equipa' && write.slug === 'equipa'))
 assert.equal(f.state.profile.name, 'Edited member')
 assert.equal(f.state.changelog, true)
 await p.reload()
 await p.locator('.make-shell').waitFor()
})
test('setup invitation input normalizes pasted lists and sends each recipient once', async t => {
 const f = await fixture(t, { state: workspace() }), p = f.page
 await p.goto(origin)
 await f.button('Continuar').click()
 const input = f.input('Emails dos membros')
 await input.fill('ANA@example.com\nines@example.com; ana@example.com, person@example.com third@example.com')
 assert.equal(await input.inputValue(), 'ANA@example.com, ines@example.com, ana@example.com, person@example.com third@example.com')
 await f.button('Enviar convite por email').click()
 await p.locator('.ob-updates').waitFor()
 const requests = () => f.calls.filter(call => call.path === '/api/onboarding/invite')
 await assertEventually(() => requests().length === 3)
 assert.deepEqual(requests().map(call => call.body.email).sort(), ['ana@example.com', 'ines@example.com', 'third@example.com'])
 for (const { body } of requests()) {
  assert.equal(body.organizationId, 'org')
  assert.match(body.token, /^[a-f0-9]{64}$/)
 }
 await p.locator('.ob-progress button').nth(5).click()
 await f.button('Enviar convite por email').click()
 await f.button('Começar').click()
 await p.locator('.make-shell').waitFor()
 assert.equal(requests().length, 3, 'revisiting setup does not resend queued recipients')
})
test('one failed invitation does not block another recipient or completion',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page;f.failInvite=true;await p.goto(origin)
 await f.button('Continuar').click();await p.getByRole('textbox',{name:'Emails dos membros'}).fill('bad@example.com\ngood@example.com')
 await f.button('Enviar convite por email').click();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 await p.getByText('bad@example.com: Convite recusado.').waitFor()
 assert.ok(f.calls.some(c=>c.path==='/api/onboarding/invite'&&c.body.email==='good@example.com'))
 await f.button('Remover convite').click();assert.equal(await f.button('Remover convite').count(),0)
})
test('Google sign-in keeps the original document, event path and query',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await mockGoogle(f)
 await p.goto(origin+'/eventos/test?source=shared')
 await p.evaluate(()=>window.originalDocument=true)
 await f.button('Continuar com Google').click()
 await p.locator('.ob-workspace').waitFor()
 assert.equal(p.url(),origin+'/eventos/test?source=shared')
 assert.equal(await p.evaluate(()=>window.originalDocument),true)
 const call=f.calls.find(c=>c.path.endsWith('/sign-in/social'))
 assert.equal(call.body.disableRedirect,true)
 assert.equal(new URL(call.body.callbackURL).pathname,'/google-auth.html')
 assert.equal(call.body.errorCallbackURL,call.body.callbackURL)
 await assertEventually(()=>p.context().pages().length===1)
})
test('returning email uses password; reset and password change never persist credentials',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 await p.goto(origin+'/login');await f.input('Endereço de email').fill(user.email);await p.locator('input[autocomplete="current-password"]').fill('existing-secret');await f.button('Iniciar sessão').click();await p.locator('.make-shell').waitFor()
 assert.ok(f.calls.some(c=>c.path.endsWith('/sign-in/email')&&c.body.password==='existing-secret'))
 await p.goto(origin+'/reset-password?token=test-reset-token');await p.locator('input[autocomplete="new-password"]').fill('new-secret-password');await f.button('Guardar palavra-passe').click();await p.getByText('Palavra-passe atualizada. Início de sessão disponível.').waitFor()
 assert.ok(!p.url().includes('token='))
 await p.goto(origin+'/account/password');await p.locator('input[autocomplete="current-password"]').fill('new-secret-password');await p.locator('input[autocomplete="new-password"]').fill('changed-secret-password');await f.button('Guardar palavra-passe').click();await p.getByText('Palavra-passe atualizada. As outras sessões foram terminadas.').waitFor()
 assert.ok(f.calls.some(c=>c.path.endsWith('/change-password')&&c.body.revokeOtherSessions===true))
 assert.ok(!(await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))).includes('secret'))
})
test('existing workspace resumes profile and account switch clears avatar',async t=>{
 const f=await fixture(t,{state:{...workspace(),profile:{name:'Existing',image:'data:image/webp;base64,AAAA'}}}),p=f.page
 await p.goto(origin);await p.locator('.ob-profile').waitFor();assert.equal(await p.locator('.ob-workspace').count(),0)
 await f.button('Utilizar um email diferente').click();await p.locator('.ob-email').waitFor()
 const pending=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('fontes:onboarding:v1:pending')))
 assert.equal(pending.draft.image,'');assert.equal(pending.draft.name,'')
})

test('bootstrap throttling retries and stale local completion cannot open a revoked workspace',async t=>{
 const f=await fixture(t,{state:{...workspace(),accessLost:true,organization:null,project:null,completed:true}}),p=f.page
 let attempts=0
 await p.route('**/api/onboarding',route=>{if(++attempts===1)return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','retry-after':'1'},status:429,json:{message:'Nova tentativa em breve.'}});return route.fallback()})
 await p.addInitScript(({user,state})=>localStorage.setItem('fontes:onboarding:v1:'+user.id,JSON.stringify({draft:{step:'updates',email:user.email},revision:0,invitations:[],finished:true,bootstrap:state})),{user,state:{...workspace(),completed:true}})
 await p.goto(origin);await p.getByRole('alert').filter({hasText:'O acesso ao ambiente deixou de estar disponível.'}).waitFor()
 assert.ok(attempts>=2);assert.equal(await p.locator('.make-shell').count(),0)
})
test('conflicting revisions preserve the local draft without silently replaying it',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'){
   f.state={...workspace(),revision:4,profile:{name:'Other tab'}}
   return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:409,json:{message:'Alterada noutra janela.',conflict:true}})
  }return route.fallback()
 })
 await p.goto(origin);await f.input('Nome do perfil').fill('Local stale');await f.button('Continuar').click()
 await p.getByText('Alterações noutra janela. O rascunho foi preservado e pode ser confirmado aqui.').waitFor()
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('fontes:onboarding:v1:flow-user')))
 assert.equal(saved.pending,undefined);assert.equal(saved.draft.profile,'Local stale')
 await p.getByRole('form',{name:'Correção da configuração'}).waitFor()
 assert.equal(f.state.profile.name,'Other tab')
})
test('copy invite waits for server confirmation and provides manual copy fallback',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding/invite',async route=>{await new Promise(r=>{release=r});return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{ready:true}})})
 await p.goto(origin);await f.button('Continuar').click();await f.button('Copiar link').click()
 assert.equal(await p.getByRole('textbox',{name:'Link de convite'}).count(),0)
 while(!release)await new Promise(r=>setTimeout(r,10))
 release();await p.getByRole('textbox',{name:'Link de convite'}).waitFor()
 assert.match(await p.getByRole('textbox',{name:'Link de convite'}).inputValue(),/\?invite=[a-f0-9]{64}$/)
})

test('password recovery retains the content destination and rejects external return targets',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 await p.goto(origin+'/eventos/example?source=shared');await f.button('Entrar').click()
 const recovery=await p.getByRole('link',{name:'Recuperar acesso',exact:true}).getAttribute('href')
 assert.equal(new URL(recovery,origin).searchParams.get('returnTo'),'/eventos/example?source=shared')
 await p.goto(origin+'/login?returnTo='+encodeURIComponent('https://evil.example/'))
 await f.input('Endereço de email').fill(user.email);await p.locator('input[autocomplete="current-password"]').fill('existing-secret');await f.button('Iniciar sessão').click();await p.locator('.make-shell').waitFor()
 assert.equal(p.url(),origin+'/')
})

test('email and workspace forms appear before stalled requests finish',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let releaseEmail,releaseVerify,releaseWorkspace,releasePassword
 await p.route('**/email-otp/send-verification-otp',async route=>{await new Promise(r=>{releaseEmail=r});await route.fallback()})
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{releaseVerify=r});await route.fallback()})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email)
 assert.equal(f.calls.filter(c=>c.path.includes('email')&&!c.path.includes('get-session')).length,0,'typing email never searches accounts or sends email')
 await f.button('Continuar com email').click();await p.locator('section.ob-code').waitFor();await p.getByText('Envio de código em curso para',{exact:false}).waitFor()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');assert.equal(await p.locator('.ob-code button[type="submit"], .ob-code button.ob-primary').isDisabled(),true)
 releaseEmail();await f.button('Continuar com código').click();await p.locator('.ob-password').waitFor()
 assert.equal(await p.locator('.ob-workspace').count(),0);assert.equal(await f.button('Guardar palavra-passe').isDisabled(),true,'empty passwords cannot submit');assert.equal(f.writes.length,0)
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{releasePassword=r});await route.fallback()})
 releaseVerify();await p.locator('.ob-password').waitFor();await p.locator('input[autocomplete="new-password"]').fill('password-verified');await f.button('Guardar palavra-passe').click()
 await p.locator('.ob-workspace').waitFor();await f.input('Nome').fill('Draft during password save');assert.equal(await f.button('Criar ambiente').isDisabled(),false)
 releasePassword();await p.waitForFunction(()=>!document.querySelector('.ob-workspace .ob-primary').disabled);assert.equal(await f.input('Nome').inputValue(),'Draft during password save')
 await p.route('**/api/onboarding',async route=>{if(route.request().method()==='POST'){await new Promise(r=>{releaseWorkspace=r})}await route.fallback()})
 await f.button('Criar ambiente').click();await p.locator('.ob-profile').waitFor();await f.input('Nome do perfil').fill('Draft during creation')
 assert.equal(await f.button('Continuar').isDisabled(),false);assert.equal(await p.locator('.make-shell').count(),0)
 releaseWorkspace();await f.button('Continuar').waitFor();await p.waitForFunction(()=>!document.querySelector('.ob-profile .ob-primary').disabled)
 assert.equal(await f.input('Nome do perfil').inputValue(),'Draft during creation')
})

test('profile and preferences save after a typing pause without completing onboarding',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.goto(origin);await f.input('Nome do perfil').fill('First');await f.input('Nome do perfil').fill('Final profile')
 await assertEventually(()=>f.state.profile.name==='Final profile')
 assert.equal(f.state.profile.name,'Final profile');assert.equal(f.writes.filter(w=>w.profileName==='First').length,0)
 assert.equal(f.state.completed,false);assert.equal(await p.locator('.make-shell').count(),0)
 const savedWrites=f.writes.length
 await f.button('Continuar').click();await f.button('Saltar').click()
 assert.equal(f.writes.length,savedWrites,'submitting an already saved profile does not save it again')
 await p.getByRole('switch',{name:/Novidades da Fontes/}).check()
 await assertEventually(()=>f.state.changelog===true)
 // Confirm the background write, not merely the optimistic switch value.
 for(let attempt=0;!f.state.changelog&&attempt<100;attempt++)await delay(50)
 assert.equal(f.state.changelog,true);assert.equal(f.state.completed,false)
})

 test('password failure is corrected in place without losing the workspace draft',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{release=r});await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:400,json:{message:'Palavra-passe recusada.'}})})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('test-only-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Preservar nome');assert.equal(await f.button('Criar ambiente').isDisabled(),false)
 release();await p.getByRole('form',{name:'Correção da configuração'}).waitFor();await p.getByRole('alert').filter({hasText:'Palavra-passe recusada'}).waitFor()
 assert.equal(await f.input('Nome').inputValue(),'Preservar nome')
 await p.unroute('**/api/onboarding/password')
 await p.locator('input[autocomplete="new-password"]').fill('corrected-test-password');await f.button('Confirmar correção').click()
 await assertEventually(()=>f.state.passwordRequired===false)
 const stored=await p.evaluate(()=>JSON.stringify(sessionStorage));assert.ok(stored.includes('Preservar nome'));assert.ok(!stored.includes('test-only-password'));assert.equal(f.writes.length,0)
 })
 test('empty server profile gets a usable default before workspace creation',async t=>{
 const f=await fixture(t,{user:{...user,name:''},state:{...blank(),profile:{name:''}}}),p=f.page
 await p.goto(origin);await f.input('Nome').fill('Equipa');await f.button('Criar ambiente').click();await p.locator('.ob-profile').waitFor()
 await p.waitForFunction(()=>!document.querySelector('.ob-profile .ob-primary').disabled)
 await assertEventually(()=>f.writes.length>0)
 assert.ok(f.writes[0].profileName.trim())
 })

test('reload during an unconfirmed password save keeps the draft and requests the password in place',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{release=r});await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:503,json:{message:'Indisponível.'}}).catch(()=>{})})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('transient-test-secret');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Draft before reload');await p.reload();await p.getByRole('form',{name:'Correção da configuração'}).waitFor()
 assert.equal(await f.input('Nome').inputValue(),'Draft before reload')
 const stored=await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage));assert.ok(stored.includes('Draft before reload'));assert.ok(!stored.includes('transient-test-secret'));assert.equal(f.writes.length,0)
 release()
})
test('confirmed password response unlocks setup without another configuration fetch',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('transient-test-secret')
 const reads=f.calls.filter(c=>c.path==='/api/onboarding'&&!c.body).length
 await p.route('**/api/onboarding',route=>route.request().method()==='GET'?route.abort():route.fallback())
 await f.button('Guardar palavra-passe').click();await f.input('Nome').fill('Confirmed directly')
 await f.button('Criar ambiente').click();await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.calls.filter(c=>c.path==='/api/onboarding'&&!c.body).length,reads)
 assert.equal(f.calls.filter(c=>c.path==='/api/onboarding/password').length,1)
})
test('invalid OTP can be corrected from the current draft without unverified workspace writes',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{release=r});return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:400,json:{message:'Invalid code'}})})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click();await f.input(/^Código (?:temporário|de confirmação)$/).fill('000000');await f.button('Continuar com código').click()
 await p.locator('.ob-password').waitFor();assert.equal(await f.button('Guardar palavra-passe').isDisabled(),true,'empty passwords cannot submit');release()
 await p.getByRole('form',{name:'Correção da configuração'}).waitFor();await p.getByRole('alert').waitFor();assert.equal(f.writes.length,0)
 assert.equal(await p.locator('section.ob-password').count(),1)
 await p.unroute('**/sign-in/email-otp')
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Confirmar correção').click()
 await assertEventually(()=>f.authenticated)
 await p.locator('input[autocomplete="new-password"]').fill('corrected-code-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Corrected code workspace');await f.button('Criar ambiente').click()
 await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
})

 test('sign-out after completion clears the previous account screen',async t=>{
 const f=await fixture(t,{state:{...workspace(),completed:true}}),p=f.page
 await p.goto(origin);await p.locator('.make-shell').waitFor();await f.button('Abrir menu da conta').click();await p.getByRole('menuitem',{name:'Terminar sessão'}).click()
 await p.getByRole('heading',{name:'Criar conta',exact:true}).waitFor();assert.equal(await p.locator('.make-shell').count(),0);assert.equal(await p.locator('.ob-updates').count(),0)
 await f.button('Continuar com email').click();assert.equal(await f.input('Endereço de email').inputValue(),'')
 })

test('explicit login ignores a stale completed signup draft',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await p.addInitScript(()=>sessionStorage.setItem('fontes:onboarding:v1:pending',JSON.stringify({draft:{step:'updates',email:'stale@example.com',returning:false,provider:'email'}})))
 await p.goto(origin+'/login');await p.getByRole('heading',{name:'Iniciar sessão',exact:true}).waitFor();await p.locator('input[autocomplete="current-password"]').waitFor();assert.equal(await p.locator('section.ob-code').count(),0)
})


test('password form keeps its input and focus while session bootstrap is pending',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let releaseVerify,releaseBootstrap
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{releaseVerify=r});await route.fallback()})
 await p.route('**/api/onboarding',async route=>{if(route.request().method()==='GET')await new Promise(r=>{releaseBootstrap=r});await route.fallback()})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Continuar com código').click()
 const input=p.locator('input[autocomplete="new-password"]')
 await input.fill('half-typed-password')
 await input.evaluate(el=>{window.passwordInput=el;el.focus()})
 releaseVerify()
 for(let i=0;!releaseBootstrap&&i<100;i++)await delay(20)
 assert.ok(releaseBootstrap);await delay(200)
 assert.equal(await input.evaluate(el=>el===window.passwordInput&&el===document.activeElement),true)
 assert.equal(await input.inputValue(),'half-typed-password')
 releaseBootstrap();await p.waitForFunction(()=>!document.querySelector('[role="status"]')?.textContent?.includes('A recuperar'))
 await delay(200)
 assert.equal(await input.evaluate(el=>el===window.passwordInput&&el===document.activeElement),true)
 assert.equal(await input.inputValue(),'half-typed-password')
})

test('password and workspace submit instantly before verification, then sync in order',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let releaseVerify,releasePassword
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{releaseVerify=r});await route.fallback()})
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{releasePassword=r});await route.fallback()})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Continuar com código').click()
 await p.locator('input[autocomplete="new-password"]').fill('queued-secret-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Instant workspace');await f.button('Criar ambiente').click()
 await f.input('Nome do perfil').fill('Uninterrupted profile')
 assert.equal(f.authenticated,false);assert.equal(f.writes.length,0)
 assert.ok(!JSON.stringify(f.calls).includes('queued-secret-password'))
 releaseVerify()
 for(let i=0;!releasePassword&&i<100;i++)await delay(20)
 assert.ok(releasePassword)
 assert.equal(await f.input('Nome do perfil').inputValue(),'Uninterrupted profile')
 assert.equal(f.writes.length,0)
 releasePassword()
 await p.waitForFunction(()=>!document.querySelector('.ob-profile .ob-primary').disabled)
 assert.equal(await f.input('Nome do perfil').inputValue(),'Uninterrupted profile')
 await assertEventually(()=>f.writes.length>0)
 assert.equal(f.writes[0].name,'Instant workspace')
 assert.equal(f.calls.filter(c=>c.path==='/api/onboarding/password').length,1)
 const stored=await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))
 assert.ok(!stored.includes('queued-secret-password'));assert.ok(!stored.includes('123456'))
})


test('the entire draft reaches the final screen while verification is stalled, then saves in order',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true,canInvite:false,canEditWorkspace:false}}),p=f.page
 let releaseVerify
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{releaseVerify=r});await route.fallback()})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Continuar com código').click()
 await p.locator('input[autocomplete="new-password"]').fill('queued-secret-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Uninterrupted workspace');await f.button('Criar ambiente').click();await f.input('Nome do perfil').fill('Uninterrupted profile');await f.button('Continuar').click()
 await f.input('Emails dos membros').fill('member@example.com');await f.button('Enviar convite por email').click()
 await p.getByRole('switch',{name:/Novidades da Fontes/}).check();await f.button('Começar').click()
 assert.equal(f.authenticated,false);assert.equal(f.writes.length,0);await p.locator('.ob-updates').waitFor()
 releaseVerify();await p.locator('.make-shell').waitFor()
 assert.equal(f.state.profile.name,'Uninterrupted profile');assert.equal(f.state.changelog,true);assert.equal(f.state.completed,true)
 await assertEventually(()=>f.calls.some(c=>c.path==='/api/onboarding/invite'&&c.body.email==='member@example.com'))
 assert.equal(f.calls.find(c=>c.path==='/api/onboarding/invite').body.organizationId,'org')
})

test('two tabs preserve unfinished profile edits without echoing configuration requests', async t => {
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.goto(origin);await p.locator('.ob-profile').waitFor()
 const second=await p.context().newPage()
 await second.goto(origin);await second.locator('.ob-profile').waitFor()
 let release
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST')await new Promise(r=>{release=r})
  return route.fallback()
 })
 await f.input('Nome do perfil').fill('Draft in first tab')
 await second.getByRole('textbox',{name:'Nome do perfil'}).fill('Saved in second tab')
 await delay(1200)
 assert.equal(await f.input('Nome do perfil').inputValue(),'Draft in first tab')
 assert.ok(f.calls.filter(c=>c.path==='/api/onboarding'&&!c.body).length<=6,'one fetch per mount, not a storage feedback loop')
 if(release)release()
 await second.close()
})

test('a stalled optional invitation cannot delay the final configuration save',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding/invite',async route=>{await new Promise(r=>{release=r});await route.fallback().catch(()=>{})})
 await p.goto(origin);await f.button('Continuar').click()
 await f.input('Emails dos membros').fill('member@example.com');await f.button('Enviar convite por email').click()
 await f.button('Começar').click();await p.locator('.make-shell').waitFor({timeout:2000})
 assert.equal(f.state.completed,true)
 assert.ok(release,'invitation is still in flight when setup has completed')
 release()
})

async function assertEventually(check) {
 for(let i=0;i<150;i++){if(check())return;await delay(20)}
 assert.ok(check(),'expected state was not confirmed within 3 seconds')
}

test('preference changes while required profile confirmation is pending are retained',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'&&!release)await new Promise(r=>{release=r})
  return route.fallback()
 })
 await p.goto(origin);await f.input('Nome do perfil').fill('Profile still saving');await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click()
 await assertEventually(()=>!!release)
 await p.getByRole('switch',{name:/Novidades da Fontes/}).check()
 release();await p.locator('.make-shell').waitFor();await assertEventually(()=>f.state.completed&&f.state.changelog)
 assert.equal(f.state.changelog,true,'the confirmed result must include edits made during the request')
})

test('a late invalid code can be corrected on the final screen and finish the queued setup',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{release=r});await route.fulfill({status:400,json:{message:'Invalid code'}})})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('000000');await f.button('Continuar com código').click()
 await p.locator('input[autocomplete="new-password"]').fill('final-correction-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Final correction');await f.button('Criar ambiente').click();await f.input('Nome do perfil').fill('Preserved profile');await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click()
 release();await p.getByRole('form',{name:'Correção da configuração'}).waitFor();assert.equal(await p.locator('section.ob-updates').count(),1);assert.equal(f.writes.length,0)
 await p.unroute('**/sign-in/email-otp');await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Confirmar correção').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.state.profile.name,'Preserved profile');assert.equal(f.state.completed,true)
})


test('recovery uses the onboarding theme and keeps email and password labels visible',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 for(const colorScheme of ['light','dark']){
  await p.emulateMedia({colorScheme});await p.goto(origin+'/reset-password')
  assert.equal(await p.locator('.ob-page').getAttribute('data-theme'),colorScheme)
  const label=p.locator('.ob-visible-label > span:not(.ob-field-feedback)')
  assert.ok(await label.evaluate(el=>el.getBoundingClientRect().width>20&&getComputedStyle(el).clipPath==='none'))
  await f.input('Email').fill('test@example.com');await f.button('Enviar link de recuperação').click()
  await p.getByRole('status').filter({hasText:'Se existir uma conta'}).waitFor()
  await p.goto(origin+'/reset-password?token=test')
  const field=p.getByLabel('Palavra-passe',{exact:true});await field.fill('visible-label-password')
  await f.button('Mostrar palavra-passe').click();assert.equal(await field.getAttribute('type'),'text')
  assert.equal(await field.inputValue(),'visible-label-password')
  await f.button('Ocultar palavra-passe').click();assert.equal(await field.getAttribute('type'),'password')
 }
})

test('an expired authentication can be renewed on the current screen without losing queued setup',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{release=r});await route.fulfill({status:401,json:{message:'Nova autenticação necessária.',step:'email'}})})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('renewed-session-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Preserved after expiry');await f.button('Criar ambiente').click();await f.input('Nome do perfil').fill('Retained profile');await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click()
 release();await p.getByRole('form',{name:'Correção da configuração'}).waitFor({timeout:2000})
 assert.equal(await p.locator('section.ob-updates').count(),1);assert.equal(f.writes.length,0)
 await p.unroute('**/api/onboarding/password');await f.button('Reenviar código').click()
 await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456');await f.button('Confirmar correção').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.state.profile.name,'Retained profile');assert.equal(f.state.completed,true)
})


test('a failed password login retains the field for retry and never persists it',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 await p.route('**/sign-in/email',route=>route.fulfill({status:503,json:{message:'Unavailable'}}))
 await p.goto(origin+'/login');await f.input('Endereço de email').fill(user.email)
 const field=p.locator('input[autocomplete="current-password"]');await field.fill('retryable-login-secret');await f.button('Iniciar sessão').click();await p.getByRole('alert').waitFor()
 assert.equal(await field.inputValue(),'retryable-login-secret')
 assert.ok(!(await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))).includes('retryable-login-secret'))
 await p.unroute('**/sign-in/email');await f.button('Iniciar sessão').click();await p.locator('.make-shell').waitFor()
})

test('an invite-link request made during workspace creation completes without a second click',async t=>{
 const f=await fixture(t,{state:blank()}),p=f.page
 let release
 await p.route('**/api/onboarding',async route=>{if(route.request().method()==='POST'&&!release)await new Promise(r=>{release=r});return route.fallback()})
 await p.goto(origin);await f.input('Nome').fill('Link draft');await f.button('Criar ambiente').click();await f.button('Continuar').click();await f.button('Copiar link').click()
 assert.equal(f.calls.filter(c=>c.path==='/api/onboarding/invite').length,0)
 await assertEventually(()=>!!release);release()
 await f.input('Link de convite').waitFor();assert.match(await f.input('Link de convite').inputValue(),/invite=[a-f0-9]{64}$/)
 assert.equal(f.calls.filter(c=>c.path==='/api/onboarding/invite').length,1)
})

test('a conflict on the final save keeps the draft visible and correction completes it',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let conflicted=false
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'&&route.request().postDataJSON().completed&&!conflicted){
   conflicted=true;f.state={...f.state,completed:true,revision:8,profile:{name:'Other tab'}}
   return route.fulfill({status:409,json:{message:'Alterada noutra janela.',conflict:true}})
  }
  return route.fallback()
 })
 await p.goto(origin);await f.input('Nome do perfil').fill('Final local profile');await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click()
 await p.getByRole('form',{name:'Correção da configuração'}).waitFor({timeout:2000})
 assert.equal(await p.locator('.make-shell').count(),0)
 assert.equal(await f.input('Nome do perfil a corrigir').inputValue(),'Final local profile')
 await p.reload();await p.getByRole('form',{name:'Correção da configuração'}).waitFor()
 assert.equal(await f.input('Nome do perfil a corrigir').inputValue(),'Final local profile')
 assert.equal(await p.locator('.make-shell').count(),0)
 await f.button('Confirmar correção').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.state.completed,true);assert.equal(f.state.profile.name,'Final local profile');assert.equal(f.state.revision,9)
})

test('profile images are resized, saved across reload, removable, and invalid images can be retried',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.goto(origin);await p.locator('input[type=file]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid image')})
 await p.getByRole('alert').filter({hasText:'Imagem ilegível'}).waitFor()
 await p.locator('input[type=file]').setInputFiles('public/mark.png')
 await f.button('Remover imagem').waitFor();await assertEventually(()=>!!f.state.profile.image)
 assert.match(f.state.profile.image,/^data:image\/(webp|png);base64,/)
 assert.deepEqual(await p.locator('.ob-photo img').evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight})),{width:160,height:160})
 await p.reload();await f.button('Remover imagem').waitFor();await f.button('Remover imagem').click()
 await assertEventually(()=>f.state.profile.image==='');assert.equal(await f.button('Remover imagem').count(),0)
})

test('image processing survives forward navigation and finishes before confirmed entry',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.addInitScript(()=>{
  const decode=window.createImageBitmap.bind(window)
  window.createImageBitmap=(...args)=>new Promise(resolve=>{window.releaseImage=()=>resolve(decode(...args))})
 })
 await p.goto(origin);await p.locator('input[type=file]').setInputFiles('public/mark.png')
 await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click()
 await delay(250)
 assert.equal(await p.locator('.make-shell').count(),0,'entry must include the selected image, even after fast navigation')
 await p.evaluate(()=>window.releaseImage());await p.locator('.make-shell').waitFor()
 assert.match(f.state.profile.image,/^data:image\/(webp|png);base64,/)
})

test('removing a profile image cancels an unfinished replacement',async t=>{
 const f=await fixture(t,{state:{...workspace(),profile:{name:'Pessoa',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}}}),p=f.page
 await p.addInitScript(()=>{
  const decode=window.createImageBitmap.bind(window)
  window.createImageBitmap=(...args)=>new Promise(resolve=>{window.releaseImage=()=>resolve(decode(...args))})
 })
 await p.goto(origin);await p.locator('input[type=file]').setInputFiles('public/mark.png')
 await f.button('Remover imagem').click();await p.evaluate(()=>window.releaseImage())
 await delay(100);assert.equal(await f.button('Remover imagem').count(),0,'the late replacement must not restore a removed image')
 await f.button('Continuar').click();await f.button('Saltar').click();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.state.profile.image,'')
})

test('Começar opens confirmed setup before an unresolved final response and retains preferences',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'&&route.request().postDataJSON().completed)await new Promise(r=>{release=r})
  return route.fallback()
 })
 await p.goto(origin);await f.button('Continuar').click();await f.button('Saltar').click()
 await p.getByRole('switch',{name:/Novidades da Fontes/}).check()
 const start=Date.now();await f.button('Começar').click();await p.locator('.make-shell').waitFor({timeout:1000})
 assert.ok(Date.now()-start<1000);await assertEventually(()=>!!release)
 assert.equal(f.state.completed,false)
 const pending=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('fontes:onboarding:v1:tab:flow-user')).pending)
 assert.equal(pending.completed,true);assert.equal(pending.changelog,true)
 release();await assertEventually(()=>f.state.completed&&f.state.changelog)
 await p.reload();await p.locator('.make-shell').waitFor()
})

for (const entry of ['/', '/login']) test(`Google callback at ${entry} keeps four-step progress across reload and needs no password setup`,async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),hasPassword:false}}),p=f.page
 await mockGoogle(f)
 await p.goto(origin+entry);await f.button('Continuar com Google').click();await p.locator('.ob-workspace').waitFor()
 await p.getByLabel('Passo 1 de 4').waitFor()
 await p.reload();await p.getByLabel('Passo 1 de 4').waitFor()
 await f.input('Nome').fill('Google workspace');await f.button('Criar ambiente').click()
 await p.getByLabel('Passo 2 de 4').waitFor();await f.button('Continuar').click()
 await p.getByLabel('Passo 3 de 4').waitFor();await f.button('Continuar').click()
 await p.getByLabel('Passo 4 de 4').waitFor();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 await assertEventually(()=>f.state.completed)
 assert.ok(!f.calls.some(c=>c.path.includes('email-otp')||c.path.endsWith('/onboarding/password')))
})

for (const kind of ['conflict','expired','revoked']) test(`a late ${kind} on background completion blocks entry and preserves the draft`,async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'&&route.request().postDataJSON().completed){
   await new Promise(r=>{release=r})
   if(kind==='conflict'){f.state={...f.state,revision:8,profile:{name:'Other tab'}};return route.fulfill({status:409,json:{conflict:true,message:'Alterada noutra janela.'}})}
   if(kind==='revoked'){f.state={...f.state,accessLost:true,organization:null,project:null};return route.fulfill({status:403,json:{message:'Acesso revogado.'}})}
   return route.fulfill({status:401,json:{message:'Sessão expirada.'}})
  }
  return route.fallback()
 })
 await p.goto(origin);await f.button('Continuar').click();await f.button('Saltar').click()
 await p.getByRole('switch',{name:/Novidades da Fontes/}).check();await f.button('Começar').click()
 await p.locator('.make-shell').waitFor();await assertEventually(()=>!!release);release()
 if(kind==='conflict')await p.getByRole('form',{name:'Correção da configuração'}).waitFor()
 else await p.getByRole('alert').waitFor()
 assert.equal(await p.locator('.make-shell').count(),0)
 assert.equal(await p.getByRole('switch',{name:/Novidades da Fontes/}).isEnabled(),true)
 assert.equal(await p.getByRole('switch',{name:/Novidades da Fontes/}).evaluate(el=>el.checked),true)
})

for (const returning of [false,true]) test(`Google ${returning?'login':'signup'} keeps a complete screen through slow session and setup responses`,async t=>{
 const f=await fixture(t,{authenticated:false,state:returning?{...workspace(),completed:true}:{...blank(),hasPassword:false}}),p=f.page
 let releaseSession,releaseSetup
 await mockGoogle(f)
 await p.goto(origin+(returning?'/login':'/'))
 await f.button('Continuar com Google').waitFor()
 await p.evaluate(()=>{
  window.blankFrames=0;window.originalDocument=true
  const inspect=()=>{if(!document.querySelector('.ob-panel h1, .make-shell'))window.blankFrames++;requestAnimationFrame(inspect)}
  requestAnimationFrame(inspect)
 })
 await p.context().route('**/get-session',async route=>{if(f.authenticated)await new Promise(r=>{releaseSession=r});return route.fallback()})
 await p.context().route('**/api/onboarding',async route=>{await new Promise(r=>{releaseSetup=r});return route.fallback()})
 const brandBefore = await p.locator('.ob-brand').boundingBox()
 await f.button('Continuar com Google').click();await assertEventually(()=>!!releaseSession)
 await p.getByRole('status',{name:'Ligação ao Google em curso'}).waitFor()
 assert.deepEqual(await p.locator('.ob-brand').boundingBox(),brandBefore,'spinner does not move the brand')
 assert.equal(await p.locator('.ob-panel h1').isVisible(),true)
 assert.equal(await f.button('Continuar com Google').isDisabled(),true)
 releaseSession();await assertEventually(()=>!!releaseSetup)
 assert.equal(await p.locator('.ob-panel h1').isVisible(),true)
 assert.equal(await p.locator('.ob-brand').isVisible(),true)
 assert.equal(p.context().pages().length,1,'Google window closes before setup loading finishes')
 assert.equal(await p.locator('.ob-panel h1').textContent(),returning?'Iniciar sessão':'Criar conta')
 if(returning) assert.equal(await f.input('Endereço de email').isDisabled(),true)
 assert.equal(await p.locator('.ob-workspace').count(),0)
 releaseSetup();await p.locator(returning?'.make-shell':'.ob-workspace').waitFor()
 await assertEventually(()=>p.context().pages().length===1)
 assert.equal(await p.getByRole('status',{name:'Ligação ao Google em curso'}).count(),0)
 if(!returning) await p.getByRole('navigation',{name:'Passo 1 de 4'}).waitFor()
 assert.equal(await p.evaluate(()=>window.originalDocument),true)
 assert.equal(await p.evaluate(()=>window.blankFrames),0)
})

test('blocked Google window leaves a usable form and retries successfully',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await mockGoogle(f);await p.goto(origin);await f.button('Continuar com Google').waitFor()
 await p.evaluate(()=>{window.actualOpen=window.open;window.open=()=>null})
 await f.button('Continuar com Google').click();await p.getByRole('alert').filter({hasText:'bloqueada'}).waitFor()
 assert.equal(await f.button('Continuar com Google').isEnabled(),true)
 assert.ok(!f.calls.some(c=>c.path.endsWith('/sign-in/social')))
 await p.evaluate(()=>window.open=window.actualOpen)
 await f.button('Continuar com Google').click();await p.locator('.ob-workspace').waitFor()
})

for(const failure of ['cancel','oauth','network','unverified']) test(`Google ${failure} failure preserves the form and permits retry`,async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await mockGoogle(f,{failure});await p.goto(origin)
 const popupPromise=p.waitForEvent('popup')
 await f.button('Continuar com Google').click();const popup=await popupPromise
 if(failure==='cancel'){await popup.close();await f.button('Cancelar').click()}
 if(failure!=='cancel')await p.getByRole('alert').waitFor()
 await p.waitForFunction(()=>!document.querySelector('.ob-provider').disabled)
 assert.equal(await f.button('Continuar com Google').isEnabled(),true)
 assert.equal(await p.locator('.ob-panel h1').isVisible(),true)
 assert.equal(await p.locator('.make-shell, .ob-workspace').count(),0)
 await mockGoogle(f);await f.button('Continuar com Google').click();await p.locator('.ob-workspace').waitFor()
 await assertEventually(()=>p.context().pages().length===1)
})

test('unrelated popup messages cannot authenticate the original page',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await mockGoogle(f,{failure:'cancel'});await p.goto(origin)
 const popupPromise=p.waitForEvent('popup');await f.button('Continuar com Google').click();const popup=await popupPromise
 await p.evaluate(()=>window.postMessage({type:'complete',attempt:'spoofed'},location.origin))
 await popup.waitForURL(/\/google-auth(?:\.html)?\?.*waiting=1/)
 await popup.evaluate(()=>window.opener.postMessage({type:'complete',attempt:'spoofed'},location.origin))
 await delay(100)
 assert.equal(await p.locator('.ob-workspace, .make-shell').count(),0)
 assert.equal(await f.button('Continuar com Google').isDisabled(),true)
 await popup.close();await f.button('Cancelar').click();assert.equal(await f.button('Continuar com Google').isEnabled(),true)
})

test('email sign-in retains the complete form while the authenticated setup request is pending',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 let release
 await p.route('**/api/onboarding',async route=>{await new Promise(r=>{release=r});return route.fallback()})
 await p.goto(origin+'/login');await f.input('Endereço de email').fill(user.email)
 await p.locator('input[autocomplete=current-password]').fill('existing-test-password');await f.button('Iniciar sessão').click()
 await assertEventually(()=>!!release)
 assert.equal(await p.getByRole('heading',{name:'Iniciar sessão',exact:true}).isVisible(),true)
 assert.equal(await f.input('Endereço de email').inputValue(),user.email)
 assert.equal(await f.button('Iniciar sessão').isDisabled(),true)
 assert.equal(await p.locator('.ob-brand').isVisible(),true)
 release();await p.locator('.make-shell').waitFor()
})

async function mockGoogle(f,{failure}={}) {
 await f.page.context().route('**/sign-in/social',async route=>{
  const body=route.request().postDataJSON();f.calls.push({path:'/api/auth/sign-in/social',body})
  if(failure==='network')return route.fulfill({status:503,json:{message:'Unavailable'}})
  const callback=new URL(body.callbackURL)
  if(failure==='cancel'){callback.searchParams.delete('complete');callback.searchParams.set('waiting','1')}
  else if(failure==='oauth')callback.searchParams.set('error','access_denied')
  else if(failure!=='unverified')f.authenticated=true
  await route.fulfill({json:{redirect:false,url:callback.href}})
 })
}

test('Google opens without a Fontes intermediary before navigating to the provider', async t => {
 const f = await fixture(t, { authenticated:false }), p = f.page
 let release
 await mockGoogle(f)
 await p.context().route('**/sign-in/social', async route => { await new Promise(resolve => { release = resolve }); await route.fallback() })
 await p.goto(origin)
 const popupPromise = p.waitForEvent('popup')
 await f.button('Continuar com Google').click()
 const popup = await popupPromise
 await assertEventually(() => !!release)
 assert.equal(popup.url(), 'about:blank')
 assert.equal(await popup.locator('body').innerText(), '')
 await p.getByRole('status', {name:'Ligação ao Google em curso'}).waitFor()
 release()
 await p.locator('.ob-workspace').waitFor()
 await assertEventually(() => p.context().pages().length === 1)
})
test('Google sign-in can be cancelled from the original page',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page
 await mockGoogle(f,{failure:'cancel'});await p.goto(origin)
 await f.button('Continuar com Google').click()
 await p.getByRole('status',{name:'Ligação ao Google em curso'}).waitFor()
 assert.equal(await f.button('Continuar com email').isDisabled(),true)
 await f.button('Cancelar').click()
 await assertEventually(()=>p.context().pages().length===1)
 assert.equal(await f.button('Continuar com Google').isEnabled(),true)
 await f.button('Continuar com email').click();await p.locator('.ob-email').waitFor()
})

test('Google provider window isolation cannot be mistaken for cancellation',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 let callback
 await p.context().route('**/sign-in/social',route=>{callback=route.request().postDataJSON().callbackURL;return route.fulfill({json:{redirect:false,url:'https://google-test.example/signin'}})})
 await p.context().route('https://google-test.example/signin',route=>route.fulfill({contentType:'text/html',headers:{'cross-origin-opener-policy':'same-origin'},body:'<html><a href="'+callback.replaceAll('&','&amp;')+'">Confirmar</a></html>'}))
 await p.goto(origin+'/login')
 const popupPromise=p.waitForEvent('popup');await f.button('Continuar com Google').click();const popup=await popupPromise
 await popup.getByRole('link',{name:'Confirmar',exact:true}).waitFor()
 // Chromium enforces COOP on this intercepted cross-origin document. Headless
 // WebKit does not, so explicitly remove its opener to exercise the same
 // BroadcastChannel return path; native Safari is checked separately.
 if(process.env.TEST_BROWSER==='webkit')await popup.evaluate(()=>{window.opener=null})
 assert.equal(await popup.evaluate(()=>window.opener===null),true,'callback cannot rely on an opener')
 // The old closed-window poll incorrectly cancelled after 500 ms.
 await delay(750)
 assert.equal(await f.button('Continuar com Google').isDisabled(),true)
 assert.equal(await p.getByRole('alert').count(),0)
 f.authenticated=true;await popup.getByRole('link',{name:'Confirmar',exact:true}).click()
 await p.locator('.make-shell').waitFor();await assertEventually(()=>p.context().pages().length===1)
})


for (const invited of [false, true]) test(`recovery requires fresh sign-in instead of opening another account${invited ? ' and retains its invitation' : ''}`, async t => {
 const f = await fixture(t, { authenticated: true, state: { ...workspace(), completed: true } }), p = f.page
 const destination = '/?source=recovery#saved'
 const query = new URLSearchParams({ token: 'reset-for-another-account', returnTo: destination })
 const token = 'ab'.repeat(32)
 if (invited) query.set('invite', token)
 await p.goto(origin + '/reset-password?' + query)
 await p.locator('input[autocomplete="new-password"]').fill('changed-password-456')
 await f.button('Guardar palavra-passe').click()
 await p.getByText('Palavra-passe atualizada. Início de sessão disponível.').waitFor()
 assert.equal(f.authenticated, true, 'resetting B leaves the existing A session intact until the login action')
 await f.button('Iniciar sessão').click()
 await p.locator('.ob-email').waitFor()
 assert.equal(f.authenticated, false)
 assert.equal(await p.locator('.make-shell').count(), 0)
 assert.equal(new URL(p.url()).pathname, '/login')
 assert.equal(new URL(p.url()).searchParams.get('returnTo'), destination)
 assert.equal(new URL(p.url()).searchParams.has('token'), false)
 assert.equal(f.calls.filter(c => c.path.endsWith('/reset-password')).length, 1)
 await f.input('Endereço de email').fill(user.email)
 await p.locator('input[autocomplete="current-password"]').fill('changed-password-456')
 await f.button('Iniciar sessão').click()
 if (invited) {
  await p.locator('.ob-profile').waitFor()
  assert.equal(new URL(p.url()).searchParams.has('invite'), false)
  assert.equal(f.joins, 1, 'invitation joins only after fresh sign-in')
 } else {
  await p.locator('.make-shell').waitFor()
  assert.equal(p.url(), origin + destination)
 }
})

for (const failure of ['http', 'network']) test(`recovery preserves success and retries a ${failure} sign-out failure without reusing the reset token`, async t => {
 const f = await fixture(t, { authenticated: true, state: { ...workspace(), completed: true } }), p = f.page
 let attempts = 0
 await p.route('**/api/auth/sign-out', route => {
  if (++attempts > 1) return route.fallback()
  if (failure === 'network') return route.abort('failed')
  return route.fulfill({ headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' }, status: 503, json: { message: 'Unavailable' } })
 })
 await p.goto(origin + '/reset-password?token=single-use-token')
 await p.locator('input[autocomplete="new-password"]').fill('changed-password-456')
 await f.button('Guardar palavra-passe').click()
 await f.button('Iniciar sessão').click()
 await p.getByRole('alert').filter({ hasText: 'Não foi possível terminar a sessão atual.' }).waitFor()
 assert.equal(new URL(p.url()).pathname, '/reset-password')
 assert.equal(await p.locator('.make-shell').count(), 0)
 assert.equal(f.authenticated, true)
 await p.getByText('Palavra-passe atualizada. Início de sessão disponível.').waitFor()
 await f.button('Iniciar sessão').click()
 await p.locator('.ob-email').waitFor()
 assert.equal(f.authenticated, false)
 assert.equal(f.calls.filter(c => c.path.endsWith('/reset-password')).length, 1)
})

test('registration rejection returns to password login with recovery available', async t => {
 for (const phase of ['send','verify']) {
  await t.test(phase, async t => {
   const f=await fixture(t,{authenticated:false}),p=f.page
   await p.route(phase==='send'?'**/email-otp/send-verification-otp':'**/sign-in/email-otp',route=>route.fulfill({status:400,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{code:'REGISTRATION_ACCOUNT_EXISTS',message:'Email já registado.'}}))
   await p.goto(origin)
   await f.button('Continuar com email').click()
   await f.input('Endereço de email').fill(user.email)
   await f.button('Continuar com email').click()
   if (phase==='verify') {
    await f.input(/^Código (?:temporário|de confirmação)$/).fill('123456')
    await f.button('Continuar com código').click()
   }
   await p.locator('input[autocomplete="current-password"]').waitFor()
   await f.button('Iniciar sessão').waitFor()
   await p.getByRole('link',{name:'Recuperar acesso'}).waitFor()
   assert.equal(await f.input('Endereço de email').inputValue(),user.email)
   assert.equal(await p.locator('input[autocomplete="one-time-code"]').count(),0)
  })
 }
})

test('expired onboarding session returns to password login without offering another code', async t => {
 const f=await fixture(t),p=f.page
 await p.route('**/api/onboarding',route=>route.request().method()==='POST'
  ?route.fulfill({status:401,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{message:'Sessão expirada.'}})
  :route.fallback())
 await p.goto(origin)
 await f.input('Nome').fill('Ambiente preservado')
 await f.button('Criar ambiente').click()
 await p.locator('input[autocomplete="current-password"]').waitFor()
 await p.getByRole('link',{name:'Recuperar acesso'}).waitFor()
 assert.equal(await p.locator('input[autocomplete="one-time-code"]').count(),0)
 assert.equal(f.calls.filter(call=>call.path.endsWith('/send-verification-otp')).length,0)
})
