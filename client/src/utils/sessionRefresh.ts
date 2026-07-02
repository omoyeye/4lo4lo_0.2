// Session refresh utility for admin authentication
export async function refreshAdminSession(): Promise<boolean> {
  try {
    // Check if we have admin credentials in localStorage
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      return false;
    }

    // Test if current session is still valid
    const response = await fetch("/api/admin/stats", {
      credentials: 'include'
    });

    if (response.ok) {
      return true; // Session is still valid
    }

    // If session is invalid, try to refresh by making a ping request
    const pingResponse = await fetch("/api/user", {
      credentials: 'include'
    });

    return pingResponse.status !== 401;
  } catch (error) {
    console.error("Session refresh failed:", error);
    return false;
  }
}

export function handleAuthenticationError() {
  // Clear admin status
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  
  // Redirect to admin login
  window.location.href = "/admin/login";
}