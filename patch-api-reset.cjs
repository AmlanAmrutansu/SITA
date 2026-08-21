const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/src/lib/api.ts', 'utf8');

content = content.replace(
  `  googleUrl: () => '/api/auth/google',`,
  `  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: \`\${window.location.origin}/auth?reset=true\`,
    });
    if (error) throw new Error(error.message);
  },`
);

fs.writeFileSync('artifacts/sita-health/src/lib/api.ts', content);

