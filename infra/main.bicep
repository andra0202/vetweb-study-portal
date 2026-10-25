@description('Location for all resources')
param location string = resourceGroup().location
@secure()
param postgresAdminPassword string
param postgresAdminLogin string = 'vetwebadmin'
param postgresServerName string

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: { name: 'Standard_B1ms'; tier: 'Burstable' }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: { storageSizeGB: 32; autoGrow: 'Enabled' }
    backup: { backupRetentionDays: 7; geoRedundantBackup: 'Disabled' }
    network: { publicNetworkAccess: 'Disabled' }
  }
}
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = { parent: postgres name: 'vetweb_study' properties: {} }
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = { name: '${postgresServerName}-kv' location: location properties: { tenantId: subscription().tenantId sku: { family: 'A'; name: 'standard' } enableRbacAuthorization: true enablePurgeProtection: true } }
output databaseName string = database.name
output keyVaultName string = vault.name
