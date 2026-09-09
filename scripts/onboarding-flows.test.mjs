import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, webkit } from 'playwright'
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5183'
const user = { id:'flow-user',email:'person@example.com',name:'Pessoa',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() }
const blank = () => ({organization:null,project:null,profile:{name:'Pessoa'},revision:0,completed:false,changelog:false,daily:false,passwordRequired:false,canInvite:true,canEditWorkspace:true})
const workspace = () => ({...blank(),organization:{id:'org',name:'Equipa',slug:'equipa'},project:{id:'project',organizationId:'org',name:'Projeto',createdAt:user.createdAt}})
async function fixture(t, options={}) {
 const user=options.user||{ id:'flow-user',email:'person@example.com',name:'Pessoa',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };const browser=await (process.env.TEST_BROWSER === 'webkit' ? webkit : chromium).launch();t.after(()=>browser.close());const page=await browser.newPage();page.setDefaultTimeout(7000)
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);if(process.env.DEBUG_TEST)console.log(e.stack)});t.after(()=>assert.deepEqual(errors,[]))
 const f={page,state:options.state||blank(),authenticated:options.authenticated??true,writes:[],calls:[],offline:false,joins:0,failInvite:false}
 await page.route('**/api/**',async route=>{
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
test('new email account requires password; completion waits for server across reload',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 await p.goto(origin)
 await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click()
 await f.input('Código de confirmação').fill('123456');await f.button('Continuar com código').click()
 await p.getByRole('heading',{name:'Definir palavra-passe',exact:true}).waitFor()
 await p.locator('input[autocomplete="new-password"]').fill('test-secret-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Equipa');await f.button('Criar ambiente').click()
 await f.input('Nome do perfil').fill('Pessoa final');await f.button('Criar perfil').click();await f.button('Saltar').click()
 f.offline=true;await f.button('Começar').click();await p.getByRole('alert').filter({hasText:'Indisponível'}).waitFor()
 assert.equal(await p.locator('.make-shell').count(),0)
 await p.reload();await p.locator('.ob-updates').waitFor();assert.equal(await p.locator('.make-shell').count(),0)
 f.offline=false;await p.evaluate(()=>dispatchEvent(new Event('online')));await p.locator('.make-shell').waitFor()
 assert.equal(f.state.completed,true);assert.equal(f.state.profile.name,'Pessoa final')
 const storage=await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))
 assert.ok(!storage.includes('test-secret-password'));assert.ok(!storage.includes('123456'))
})
test('invitation has explicit acceptance, skips owner setup and owner-only back/invites',async t=>{
 const f=await fixture(t),p=f.page;await p.goto(origin+'/?invite='+'ab'.repeat(32))
 await p.getByText('Convite para Equipa convidada.',{exact:false}).waitFor();assert.equal(f.joins,0)
 await f.button('Aceitar convite').click();await p.locator('.ob-profile').waitFor()
 assert.equal(await f.button('Voltar').count(),0);assert.equal(await p.locator('.ob-workspace').count(),0)
 await f.button('Criar perfil').click();await p.locator('.ob-updates').waitFor();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 assert.equal(f.joins,1);assert.ok(!p.url().includes('invite='))
})
test('one failed invitation does not block another recipient or completion',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page;f.failInvite=true;await p.goto(origin)
 await f.button('Criar perfil').click();await p.getByRole('textbox',{name:'Emails dos membros'}).fill('bad@example.com\ngood@example.com')
 await f.button('Enviar convite por email').click();await f.button('Começar').click();await p.locator('.make-shell').waitFor()
 await p.getByText('bad@example.com: Convite recusado.').waitFor()
 assert.ok(f.calls.some(c=>c.path==='/api/onboarding/invite'&&c.body.email==='good@example.com'))
 await f.button('Remover convite').click();assert.equal(await f.button('Remover convite').count(),0)
})
test('Google callback preserves event path and query',async t=>{
 const f=await fixture(t,{authenticated:false}),p=f.page;await p.goto(origin+'/eventos/test?source=shared')
 await f.button('Continuar com Google').click()
 await p.waitForFunction(()=>document.querySelector('.ob-page'))
 const call=f.calls.find(c=>c.path.endsWith('/sign-in/social'));assert.ok(call);assert.equal(call.body.callbackURL,origin+'/eventos/test?source=shared')
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
 await f.button('Voltar').click();await f.button('Utilizar um email diferente').click();await p.locator('.ob-email').waitFor()
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
test('conflicting revisions recover server values rather than replay stale changes',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.route('**/api/onboarding',async route=>{
  if(route.request().method()==='POST'){
   f.state={...workspace(),revision:4,profile:{name:'Other tab'}}
   return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:409,json:{message:'Alterada noutra janela.',conflict:true}})
  }return route.fallback()
 })
 await p.goto(origin);await f.input('Nome do perfil').fill('Local stale');await f.button('Criar perfil').click()
 await p.getByText('Configuração recuperada do servidor após alterações noutra janela.').waitFor()
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('fontes:onboarding:v1:flow-user')))
 assert.equal(saved.pending,undefined);assert.equal(saved.draft.profile,'Other tab')
})
test('copy invite waits for server confirmation and provides manual copy fallback',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 let release
 await p.route('**/api/onboarding/invite',async route=>{await new Promise(r=>{release=r});return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{ready:true}})})
 await p.goto(origin);await f.button('Criar perfil').click();await f.button('Copiar link').click()
 assert.equal(await p.getByRole('textbox',{name:'Link de convite'}).count(),0)
 while(!release)await new Promise(r=>setTimeout(r,10))
 release();await p.getByRole('textbox',{name:'Link de convite'}).waitFor()
 assert.match(await p.getByRole('textbox',{name:'Link de convite'}).inputValue(),/\?invite=[a-f0-9]{64}$/)
})

test('password recovery retains the content destination and rejects external return targets',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...workspace(),completed:true}}),p=f.page
 await p.goto(origin+'/eventos/example?source=shared');await f.button('Login').click()
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
 await f.input('Código de confirmação').fill('123456');assert.equal(await p.locator('.ob-code button[type="submit"], .ob-code button.ob-primary').isDisabled(),true)
 releaseEmail();await f.button('Continuar com código').click();await p.locator('.ob-password').waitFor()
 assert.equal(await p.locator('.ob-workspace').count(),0);assert.equal(await f.button('Guardar palavra-passe').isDisabled(),true);assert.equal(f.writes.length,0)
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{releasePassword=r});await route.fallback()})
 releaseVerify();await p.locator('.ob-password').waitFor();await p.locator('input[autocomplete="new-password"]').fill('password-verified');await f.button('Guardar palavra-passe').click()
 await p.locator('.ob-workspace').waitFor();await f.input('Nome').fill('Draft during password save');assert.equal(await f.button('Criar ambiente').isDisabled(),true)
 releasePassword();await p.waitForFunction(()=>!document.querySelector('.ob-workspace .ob-primary').disabled);assert.equal(await f.input('Nome').inputValue(),'Draft during password save')
 await p.route('**/api/onboarding',async route=>{if(route.request().method()==='POST'){await new Promise(r=>{releaseWorkspace=r})}await route.fallback()})
 await f.button('Criar ambiente').click();await p.locator('.ob-profile').waitFor();await f.input('Nome do perfil').fill('Draft during creation')
 assert.equal(await f.button('Criar perfil').isDisabled(),true);assert.equal(await p.locator('.make-shell').count(),0)
 releaseWorkspace();await f.button('Criar perfil').waitFor();await p.waitForFunction(()=>!document.querySelector('.ob-profile .ob-primary').disabled)
 assert.equal(await f.input('Nome do perfil').inputValue(),'Draft during creation')
})

test('workspace URL preflight debounces, caches exact results and ignores stale responses',async t=>{
 const f=await fixture(t),p=f.page,checks=[]
 let releaseOld
 await p.route('**/api/onboarding/availability',async route=>{
  const body=route.request().postDataJSON();checks.push(body.slug)
  if(body.slug==='old-name'){await new Promise(r=>{releaseOld=r});try{await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{available:false}})}catch{};return}
  await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},json:{available:true}})
 })
 await p.goto(origin);await f.input('Nome').fill('Old name')
 await p.waitForFunction(()=>document.querySelector('.ob-workspace'))
 for(let i=0;!releaseOld&&i<200;i++)await new Promise(r=>setTimeout(r,10));assert.ok(releaseOld)
 await f.input('Nome').fill('New name');await p.getByText('URL disponível. Confirmação final na criação.').waitFor()
 releaseOld();assert.equal(await p.getByText('Este URL já está em uso.',{exact:true}).count(),0)
 await f.input('Nome').fill('Temporary');await f.input('Nome').fill('New name')
 await p.getByText('URL disponível. Confirmação final na criação.').waitFor()
 assert.equal(checks.filter(v=>v==='new-name').length,1)
 assert.equal(checks.includes('temporary'),false);assert.equal(f.writes.length,0)
})

test('profile and preferences save after a typing pause without completing onboarding',async t=>{
 const f=await fixture(t,{state:workspace()}),p=f.page
 await p.goto(origin);await f.input('Nome do perfil').fill('First');await f.input('Nome do perfil').fill('Final profile')
 await p.getByText('Alterações guardadas.',{exact:true}).waitFor()
 assert.equal(f.state.profile.name,'Final profile');assert.equal(f.writes.filter(w=>w.profileName==='First').length,0)
 assert.equal(f.state.completed,false);assert.equal(await p.locator('.make-shell').count(),0)
 await f.button('Criar perfil').click();await f.button('Saltar').click();await p.getByRole('switch',{name:/Changelog/}).check()
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('fontes:onboarding:v1:flow-user')).pending?.changelog===true||document.querySelector('.ob-stage').textContent.includes('Alterações guardadas.'))
 await p.getByText('Alterações guardadas.',{exact:true}).waitFor()
 // Confirm the background write, not merely the optimistic switch value.
 for(let attempt=0;!f.state.changelog&&attempt<100;attempt++)await delay(50)
 assert.equal(f.state.changelog,true);assert.equal(f.state.completed,false)
})

 test('password failure returns to password without losing workspace draft',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{release=r});await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:400,json:{message:'Palavra-passe recusada.'}})})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('test-only-password');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Preservar nome');assert.equal(await f.button('Criar ambiente').isDisabled(),true)
 release();await p.locator('.ob-password').waitFor();await p.getByRole('alert').filter({hasText:'Palavra-passe recusada'}).waitFor()
 const stored=await p.evaluate(()=>JSON.stringify(localStorage));assert.ok(stored.includes('Preservar nome'));assert.ok(!stored.includes('test-only-password'));assert.equal(f.writes.length,0)
 })
 test('empty server profile gets a usable default before workspace creation',async t=>{
 const f=await fixture(t,{user:{...user,name:''},state:{...blank(),profile:{name:''}}}),p=f.page
 await p.goto(origin);await f.input('Nome').fill('Equipa');await f.button('Criar ambiente').click();await p.locator('.ob-profile').waitFor()
 await p.waitForFunction(()=>!document.querySelector('.ob-profile .ob-primary').disabled)
 assert.ok(f.writes[0].profileName.trim())
 })

test('reload during an unconfirmed password save returns to password and never persists credentials',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/api/onboarding/password',async route=>{await new Promise(r=>{release=r});await route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:503,json:{message:'Indisponível.'}}).catch(()=>{})})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('transient-test-secret');await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Draft before reload');await p.reload();await p.locator('.ob-password').waitFor()
 const stored=await p.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage));assert.ok(stored.includes('Draft before reload'));assert.ok(!stored.includes('transient-test-secret'));assert.equal(f.writes.length,0)
 release()
})
test('password success with failed bootstrap stays blocked until retry confirms it',async t=>{
 const f=await fixture(t,{state:{...blank(),passwordRequired:true}}),p=f.page
 let fail=false
 await p.route('**/api/onboarding',async route=>{if(fail&&route.request().method()==='GET')return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:503,json:{message:'Confirmação indisponível.'}});return route.fallback()})
 await p.goto(origin);await p.locator('input[autocomplete="new-password"]').fill('transient-test-secret');fail=true;await f.button('Guardar palavra-passe').click()
 await f.input('Nome').fill('Keep during retry');await p.getByRole('alert').filter({hasText:'Confirmação indisponível'}).waitFor();assert.equal(await f.button('Criar ambiente').isDisabled(),true);assert.equal(f.writes.length,0)
 fail=false;await f.button('Tentar novamente').click();await p.waitForFunction(()=>!document.querySelector('.ob-workspace .ob-primary').disabled)
 assert.equal(await f.input('Nome').inputValue(),'Keep during retry');assert.equal(f.calls.filter(c=>c.path==='/api/onboarding/password').length,1)
})
test('invalid OTP returns from password draft to code without workspace writes',async t=>{
 const f=await fixture(t,{authenticated:false,state:{...blank(),passwordRequired:true}}),p=f.page
 let release
 await p.route('**/sign-in/email-otp',async route=>{await new Promise(r=>{release=r});return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},status:400,json:{message:'Invalid code'}})})
 await p.goto(origin);await f.button('Continuar com email').click();await f.input('Endereço de email').fill(user.email);await f.button('Continuar com email').click();await f.input('Código de confirmação').fill('000000');await f.button('Continuar com código').click()
 await p.locator('.ob-password').waitFor();assert.equal(await f.button('Guardar palavra-passe').isDisabled(),true);release()
 await p.locator('section.ob-code').waitFor();await p.getByRole('alert').waitFor();assert.equal(f.writes.length,0)
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
 await p.goto(origin+'/login');await p.getByRole('heading',{name:'Perfil existente',exact:true}).waitFor();await p.locator('input[autocomplete="current-password"]').waitFor();assert.equal(await p.locator('section.ob-code').count(),0)
})
