
let pages = [
    { url: '', title: 'Home' },
    { url: 'meta/', title: 'Meta' },
  ];
  
  //are we on the home page?
  // const is like let but it's immutable
  const ARE_WE_HOME = document.documentElement.classList.contains('home');
  
  // Determine the base URL for GitHub Pages and local server
  const BASE_URL = window.location.hostname === '127.0.0.1' ? '/' : '/106-Project-3/';
  
  // create nav element and place at beginning of body
  let nav = document.createElement('nav')
  document.body.prepend(nav);
  // edit url
  //iterate over pages and add <a> elements for all links
  
  for (let p of pages){
    let url = p.url;
    let title = p.title;
    url = !ARE_WE_HOME && !url.startsWith('http') ? BASE_URL + url : url;
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);  
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
    if (a.host !== location.host) {
      a.target = "_blank"
    }
  }