window.addEventListener("error",event=>console.error("[FEIROO error source] "+JSON.stringify({message:event.message,file:event.filename,line:event.lineno,stack:event.error?.stack})));
