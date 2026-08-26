function addUser(){
    let html = `
    <div class="headrow">
        <div><h2>Agregar Usuario</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Nombre visible del encargado:</label><input id="i_dn" class="field"></div>
        <div><label>Nombre de usuario:</label><input id="i_un" class="field"></div>
        <div><label>Clave inicial:</label><input id="i_pw" class="field"></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    setTimeout(() => document.getElementById('i_dn').focus(), 100);
    document.getElementById('btnSave').onclick = () => {
        let dn = document.getElementById('i_dn').value.trim();
        let un = document.getElementById('i_un').value.trim();
        let pw = document.getElementById('i_pw').value.trim();
        if(!dn || !un || !pw) return toast('Todos los campos son obligatorios', 'error');
        if(db.users.some(u => u.username.toLowerCase() === un.toLowerCase())) return toast('Ese usuario ya existe.', 'error');
        db.users.push({id:uid('u'),displayName:dn,username:un,password:pw,active:true});
        audit('Alta','Usuario',un,dn);
        save(); fillLoginUsers(); closeModal(); toast('Usuario agregado');
    };
}

function editUser(id){
    let u = db.users.find(x=>x.id===id); if(!u) return;
    let html = `
    <div class="headrow">
        <div><h2>Editar Usuario</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Nombre visible:</label><input id="i_dn" class="field" value="${u.displayName}"></div>
        <div><label>Usuario:</label><input id="i_un" class="field" value="${u.username}"></div>
        <div><label>Clave:</label><input id="i_pw" class="field" value="${u.password}"></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    document.getElementById('btnSave').onclick = () => {
        let dn = document.getElementById('i_dn').value.trim();
        let un = document.getElementById('i_un').value.trim();
        let pw = document.getElementById('i_pw').value.trim();
        if(!dn || !un || !pw) return toast('Todos los campos son obligatorios', 'error');
        u.displayName=dn; u.username=un; u.password=pw;
        save(); fillLoginUsers(); closeModal(); toast('Usuario editado');
    };
}

function addFletero(){
    let html = `
    <div class="headrow">
        <div><h2>Agregar Fletero</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Nombre obligatorio:</label><input id="i_n" class="field"></div>
        <div><label>Apellido (opcional):</label><input id="i_s" class="field"></div>
        <div><label>Empresa transportista (opcional):</label><input id="i_c" class="field"></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    setTimeout(() => document.getElementById('i_n').focus(), 100);
    document.getElementById('btnSave').onclick = () => {
        let n = document.getElementById('i_n').value.trim();
        let s = document.getElementById('i_s').value.trim();
        let c = document.getElementById('i_c').value.trim();
        if(!n) return toast('El nombre es obligatorio', 'error');
        db.fleteros.push({id:uid('f'),name:n,surname:s,company:c,active:true});
        audit('Alta','Fletero',n,c);
        save(); closeModal(); toast('Fletero agregado');
    };
}

function editFletero(id){
    let f = db.fleteros.find(x=>x.id===id); if(!f) return;
    let html = `
    <div class="headrow">
        <div><h2>Editar Fletero</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Nombre:</label><input id="i_n" class="field" value="${f.name}"></div>
        <div><label>Apellido:</label><input id="i_s" class="field" value="${f.surname||''}"></div>
        <div><label>Empresa:</label><input id="i_c" class="field" value="${f.company||''}"></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    document.getElementById('btnSave').onclick = () => {
        let n = document.getElementById('i_n').value.trim();
        if(!n) return toast('El nombre es obligatorio', 'error');
        f.name=n; f.surname=document.getElementById('i_s').value.trim(); f.company=document.getElementById('i_c').value.trim();
        save(); closeModal(); toast('Fletero editado');
    };
}

function addEmployee(){
    let html = `
    <div class="headrow">
        <div><h2>Agregar Empleado</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Número de legajo:</label><input id="i_l" class="field"></div>
        <div><label>Nombre:</label><input id="i_n" class="field"></div>
        <div><label>Apellido (opcional):</label><input id="i_s" class="field"></div>
        <div><label>Fardos acumulados iniciales:</label><input id="i_b" type="number" class="field" value="0"></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    setTimeout(() => document.getElementById('i_l').focus(), 100);
    document.getElementById('btnSave').onclick = () => {
        let l = document.getElementById('i_l').value.trim();
        let n = document.getElementById('i_n').value.trim();
        let s = document.getElementById('i_s').value.trim();
        let b = Number(document.getElementById('i_b').value||0);
        if(!l || !n) return toast('El legajo y nombre son obligatorios', 'error');
        if(db.employees.some(e=>e.legajo===l)) return toast('Ese legajo ya existe.', 'error');
        db.employees.push({id:uid('e'),legajo:l,name:n,surname:s,active:true,balance:b,lastCredit:''});
        db.employees.sort((a,b)=>a.legajo.localeCompare(b.legajo));
        audit('Alta','Empleado',l,`${n} ${s}`);
        save(); closeModal(); toast('Empleado agregado');
    };
}

function editEmployee(id){
    let e = db.employees.find(x=>x.id===id); if(!e) return;
    let html = `
    <div class="headrow">
        <div><h2>Editar Empleado</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Legajo:</label><input id="i_l" class="field" value="${e.legajo}"></div>
        <div><label>Nombre:</label><input id="i_n" class="field" value="${e.name}"></div>
        <div><label>Apellido:</label><input id="i_s" class="field" value="${e.surname||''}"></div>
        <div><label>Saldo de beneficio:</label><input id="i_b" type="number" class="field" value="${e.balance||0}"></div>
        <div><label>Estado:</label><select id="i_a" class="field"><option value="1" ${e.active?'selected':''}>Activo</option><option value="0" ${!e.active?'selected':''}>Inactivo</option></select></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    document.getElementById('btnSave').onclick = () => {
        let l = document.getElementById('i_l').value.trim();
        let n = document.getElementById('i_n').value.trim();
        if(!l || !n) return toast('El legajo y nombre son obligatorios', 'error');
        e.legajo=l; e.name=n; e.surname=document.getElementById('i_s').value.trim();
        e.balance=Number(document.getElementById('i_b').value||0);
        e.active = document.getElementById('i_a').value === "1";
        if(!e.active) e.balance = 0;
        db.employees.sort((a,b)=>a.legajo.localeCompare(b.legajo));
        save(); closeModal(); toast('Empleado editado');
    };
}

function addProduct(){
    let html = `
    <div class="headrow">
        <div><h2>Agregar Producto</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Código alfanumérico:</label><input id="i_id" class="field"></div>
        <div><label>Nombre del producto:</label><input id="i_n" class="field"></div>
        <div style="display:flex;gap:10px;">
            <div style="flex:1"><label>Uds/Fardo:</label><input id="i_pk" type="number" class="field" value="6"></div>
            <div style="flex:1"><label>Fardos/Corte:</label><input id="i_pc" type="number" class="field" value="20"></div>
            <div style="flex:1"><label>Cortes/Planchada:</label><input id="i_c" type="number" class="field" value="4"></div>
        </div>
        <div style="display:flex;gap:10px;">
            <div style="flex:1"><label>Stock Mínimo:</label><input id="i_ms" type="number" class="field" value="0"></div>
            <div style="flex:1"><label>Stock Crítico:</label><input id="i_cs" type="number" class="field" value="0"></div>
        </div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    setTimeout(() => document.getElementById('i_id').focus(), 100);
    document.getElementById('btnSave').onclick = () => {
        let id = document.getElementById('i_id').value.trim();
        let n = document.getElementById('i_n').value.trim();
        if(!id || !n) return toast('Código y nombre obligatorios', 'error');
        if(db.products.some(p=>p.id===id)) return toast('Ese código ya existe', 'error');
        let pk=Number(document.getElementById('i_pk').value);
        let pc=Number(document.getElementById('i_pc').value);
        let cuts=Number(document.getElementById('i_c').value);
        if(!pk || !pc || !cuts) return toast('Empaque inválido', 'error');
        db.products.push({id,name:n,pack:pk,perCut:pc,cuts:cuts,minStock:Number(document.getElementById('i_ms').value||0),criticalStock:Number(document.getElementById('i_cs').value||0),active:true});
        db.stock[id]=0; audit('Alta','Producto',id,n);
        save(); closeModal(); toast('Producto agregado');
    };
}

function editProduct(id){
    let p = db.products.find(x=>x.id===id); if(!p) return;
    let html = `
    <div class="headrow">
        <div><h2>Editar Producto</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">✖</button>
    </div>
    <div class="modal-form">
        <div><label>Código alfanumérico:</label><input id="i_id" class="field" value="${p.id}"></div>
        <div><label>Nombre del producto:</label><input id="i_n" class="field" value="${p.name}"></div>
        <div style="display:flex;gap:10px;">
            <div style="flex:1"><label>Uds/Fardo:</label><input id="i_pk" type="number" class="field" value="${p.pack}"></div>
            <div style="flex:1"><label>Fardos/Corte:</label><input id="i_pc" type="number" class="field" value="${p.perCut}"></div>
            <div style="flex:1"><label>Cortes/Planchada:</label><input id="i_c" type="number" class="field" value="${p.cuts}"></div>
        </div>
        <div style="display:flex;gap:10px;">
            <div style="flex:1"><label>Stock Mínimo:</label><input id="i_ms" type="number" class="field" value="${p.minStock||0}"></div>
            <div style="flex:1"><label>Stock Crítico:</label><input id="i_cs" type="number" class="field" value="${p.criticalStock||0}"></div>
        </div>
        <div><label>Estado:</label><select id="i_a" class="field"><option value="1" ${p.active?'selected':''}>Activo</option><option value="0" ${!p.active?'selected':''}>Inactivo</option></select></div>
    </div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>`;
    modal(html);
    document.getElementById('btnSave').onclick = () => {
        let ni = document.getElementById('i_id').value.trim();
        let n = document.getElementById('i_n').value.trim();
        if(!ni || !n) return toast('Código y nombre obligatorios', 'error');
        if(ni !== p.id && db.products.some(x=>x.id===ni)) return toast('Ese código ya existe', 'error');
        
        let old = p.id;
        p.id = ni;
        p.name = n;
        p.pack = Number(document.getElementById('i_pk').value)||p.pack;
        p.perCut = Number(document.getElementById('i_pc').value)||p.perCut;
        p.cuts = Number(document.getElementById('i_c').value)||p.cuts;
        p.minStock = Number(document.getElementById('i_ms').value||0);
        p.criticalStock = Number(document.getElementById('i_cs').value||0);
        p.active = document.getElementById('i_a').value === "1";
        
        if(ni !== old){
            db.stock[ni] = db.stock[old]||0;
            delete db.stock[old];
            db.movements.forEach(m=>{if(m.productId===old)m.productId=ni});
            db.orders.forEach(o=>o.deliveries.forEach(d=>d.lines.forEach(l=>{if(l.productId===old)l.productId=ni})));
        }
        save(); closeModal(); toast('Producto editado');
    };
}

function resetData(){
    customConfirm('¿Seguro que desea restablecer la base de datos a su versión Demo? Todos los cambios se perderán.', () => {
        safeRemove(localStorage,'talcaExpV01');
        db=clone(DEMO);
        save(); fillLoginUsers();
        toast('Datos restablecidos a Demo', 'warning');
    });
}