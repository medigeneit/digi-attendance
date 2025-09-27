export const playgroundRoute = {
  path: '/components/:id?',
  name: 'playground',
  component: () => import('./PlaygroundApp.vue'),
  meta: { devOnly: true },
};
