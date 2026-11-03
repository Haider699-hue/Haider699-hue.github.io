/* HAIDER boot — يعمل متزامنًا في <head> لتطبيق الثيم قبل أول رسم (يمنع الوميض) */
(function(){var T={nether:['#7c3aed','#c084fc'],emerald:['#a855f7','#d8b4fe']},t;try{t=localStorage.getItem('zth')}catch(e){}if(T[t]){document.documentElement.setAttribute('data-th',t);window.zTh=T[t]}})();
/* تحميل الخطوط دون حجب العرض (بديل onload المضمّن الذي يمنعه الـCSP) */
(function(){var l=document.querySelector('link[data-async-css]');if(!l)return;var on=function(){l.media='all'};l.sheet?on():l.addEventListener('load',on)})();
