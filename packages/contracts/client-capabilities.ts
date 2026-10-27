// Additive contract; old clients must refuse unknown actions instead of guessing a mapping.
export const CLIENT_CONTRACT={apiVersion:'v1',contractVersion:1,minimumContractVersion:1,
  syncMode:'canonical-refresh',offlineDecisions:false,pushEnabled:false,
  upload:{chunkBytes:262144,maxFileBytes:10485760,mediaTypes:['image/jpeg','image/png','application/pdf'],backgroundTransferCertified:false},
  nativeAuthentication:{mode:'local-development-pkce',redirectUri:'quotefix://auth',productionReady:false}} as const;
