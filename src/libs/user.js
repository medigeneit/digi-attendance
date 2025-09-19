export function getUserInitials(user){
  return user && user?.name ? user?.name.trim().charAt(0).toUpperCase() : 's'
}