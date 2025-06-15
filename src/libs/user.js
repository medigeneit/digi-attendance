export function getUserInitials(user){
  return user && user?.name ? user?.name.charAt(0).toUpperCase() : 's'
}