// Collect all demo SFCs under ./demos/*Demo.vue and their raw source
// const demoModules = import.meta.glob('./demos/*Demo.vue', { eager: true });

import DragAndDrop from '@/components/DragAndDrop.vue';
import UserAvatar from '@/components/UserAvatar.vue';



// const sourceModules = import.meta.glob('./demos/*Demo.vue', { as: 'raw', eager: true });
const demoModules = import.meta.glob('../components/chatting/*.vue', { eager: true });
const sourceModules = import.meta.glob('../components/chatting/*.vue', { as: 'raw', eager: true });

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/Demo$/, '')
    .toLowerCase();
}

let demos = Object.keys(demoModules)
  .map((path) => {
    const mod = demoModules[path];
    const file = path.split('/').pop();           // e.g. ButtonDemo.vue
    const id   = toKebab(file.replace('.vue', '')); // e.g. button
    const meta = mod.meta || {}; // each demo can `export const meta = {...}`
    return {
      id,
      title: meta.title || id,
      tags: meta.tags || [],
      component: mod.default,
      source: sourceModules[path] || '',
      file,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

demos = [
  {
    id: 'UserAvatarComp',
    title: 'UserAvatar',
    tags: [],
    component: UserAvatar,
    source:  import.meta.glob('../components/UserAvatar.vue', { as: 'raw', eager: true })?.['../components/UserAvatar.vue']?.split('/')?.join('') ,
    file: 'UserAvatar.vue',
  },
  {
    id: 'DragAndDrop',
    title: 'DragAndDrop',
    tags: [],
    component: DragAndDrop,
    source:  import.meta.glob('../components/DragAndDrop.vue', { as: 'raw', eager: true })?.['../components/DragAndDrop.vue']?.split('/')?.join('') ,
    file: 'UserAvatar.vue',
  }
]

export function allDemos() {
  return demos;
}

export function findDemo(id) {
  return demos.find((d) => d.id === id);
}

export function searchDemos(q) {
  const term = (q || '').trim().toLowerCase();
  if (!term) return demos;
  return demos.filter((d) =>
    d.title.toLowerCase().includes(term) ||
    d.tags.join(' ').toLowerCase().includes(term)
  );
}
