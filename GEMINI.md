# Reglas de Blindaje de Memoria, Sincronización y Despliegue - Talca Expedición

Este documento contiene las reglas maestras obligatorias e inquebrantables para el desarrollo, mantenimiento y mejoras del sistema **Talca Expedición**.

---

## 1. REGLA DE ORO DE DESPLIEGUE Y VERSIONADO (PREVENCIÓN DE BUCLES)

> **PROHIBICIÓN CRÍTICA:**
> NUNCA incrementar ni alterar la versión de la aplicación en la base de datos (`appVersion` en Firestore `talca/data`) sin que el nuevo código esté **previamente compilado, commiteado y publicado (`git push origin main`)** en el hosting de producción (Vercel).

### ¿Por qué?
Si Firestore reporta una versión superior (`cloudDb.appVersion > APP_BUILD_VERSION`) antes de que el servidor web entregue el nuevo `app.min.js`, todos los navegadores de los clientes detectarán que están obsoletos y forzarán una recarga (`location.reload()`). Al recargar, Vercel continuará entregando el bundle antiguo y los clientes entrarán en un **bucle infinito de recargas cada 1.5 segundos**, bloqueando por completo el sistema y agotando la cuota diaria de lecturas de Firestore (Error 429 Resource Exhausted).

### Secuencia obligatoria para cada actualización de versión:
1. **Actualizar identificadores de versión:**
   - En `js/store.js`: `const APP_BUILD_VERSION = X;`
   - En `index.html`: `<script src="app.min.js?v=X">`
   - En `sw.js`: `const CACHE_NAME = 'talca-cache-vX';`
2. **Recompilar el bundle:**
   - Ejecutar `cmd.exe /c "npm run minify"` para generar el nuevo `app.min.js`.
3. **Validación:**
   - Probar que no existan errores de sintaxis (`node run_jsdom.js` o pruebas en navegador).
4. **Publicación en Producción:**
   - Ejecutar `git add .`, `git commit` y `git push origin main`.
   - Esperar a que Vercel termine el despliegue exitosamente.
5. **Actualización en la Nube:**
   - Solo una vez desplegada la versión en Vercel, el cliente en producción actualizará `appVersion` en Firestore mediante `save()` o mediante parche controlado.

---

## 2. BLINDAJE ANTI-BUCLE EN CLIENTE (PRESERVACIÓN DE ACCESO)

- En `js/store.js` (`docRef.onSnapshot`), el detector de versión obsoleta **SIEMPRE debe contar con el escudo de cooldown** basado en `localStorage` y `sessionStorage`:
  ```javascript
  let reloadKey = `talca_reload_v${cloudDb.appVersion}`;
  let nowTime = Date.now();
  let lastReload = Number(localStorage.getItem(reloadKey) || sessionStorage.getItem(reloadKey) || 0);

  if (lastReload && (nowTime - lastReload < 60000)) {
    console.warn(`Blindaje anti-bucle activo: Ya se intentó actualizar a v${cloudDb.appVersion} hace menos de 60s. Continuando con la versión actual (v${APP_BUILD_VERSION}) para no bloquear la interfaz.`);
  } else {
    // Registrar intento y proceder con recarga única...
  }
  ```
- **Nunca** remover ni debilitar este blindaje. Si por cualquier motivo un despliegue tarda o falla, el usuario NUNCA debe quedar atrapado en un ciclo de recargas; el sistema debe permitirle ingresar y operar normalmente con la versión cargada.

---

## 3. BLINDAJE DE MEMORIA Y PROTECCIÓN DE DATOS (ANTI-DEGRADACIÓN)

1. **Bloqueo de subidas pre-sincronización:**
   - `save()` NUNCA debe subir colecciones (`orders`, `movements`, etc.) a Firestore si `hasInitialCloudSync` o `hasCollectionsInitialSync` son falsos.
   - Esto evita que un cliente que inicie con `localStorage` vacío o desactualizado sobreescriba los datos vigentes de la nube.
2. **Invariabilidad de órdenes despachadas:**
   - Si una orden en la nube tiene entregas registradas (`deliveries`) o estado `Despachada`, un estado local obsoleto (`PENDIENTE` sin entregas) NUNCA puede sobreescribirla ni eliminar sus despachos.
   - Ejecutar siempre `autoReconcileDispatchedOrders()` tras la recepción de colecciones para autoreparar cualquier discrepancia entre movimientos de stock y órdenes.
3. **Contadores y KPIs en Dashboard:**
   - En `js/ui.js`, los filtros de órdenes pendientes (administrativas o de flete) deben verificar estrictamente que `outstanding > 0` y que la orden no esté en estado `Despachada`. Órdenes con `outstanding === 0` son órdenes cumplidas y no deben computarse como pendientes de facturación ni entrega.
