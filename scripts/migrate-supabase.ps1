<#
Applies this portal's committed Prisma migrations to a Supabase database without
putting the connection password in a source file or PowerShell history.
#>

$connectionString = Read-Host "Paste the Supabase session-pooler connection string" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($connectionString)

try {
  $plainConnectionString = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $plainConnectionString = $plainConnectionString.Trim()
  # Supabase may copy this as a complete DIRECT_URL= line, quoted code, or a
  # plain URL. Extract only the connection URL and never print it back.
  if ($plainConnectionString -match '(?i)(postgres(?:ql)?://[^\s"''`]+)') {
    $plainConnectionString = $matches[1].Trim()
  }
  if ([string]::IsNullOrWhiteSpace($plainConnectionString) -or -not $plainConnectionString.StartsWith("postgres")) {
    throw "Paste either the full DIRECT_URL= line or a URL that starts with postgresql:// or postgres://."
  }

  $env:DATABASE_URL = $plainConnectionString
  & "$PSScriptRoot\..\node_modules\.bin\prisma.cmd" migrate deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & "$PSScriptRoot\..\node_modules\.bin\prisma.cmd" generate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Variable plainConnectionString -ErrorAction SilentlyContinue
}
