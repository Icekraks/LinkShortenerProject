export const normalizeHostname = (hostname: string) => hostname.toLowerCase().replace(/\.$/, "");

export const isSelfDomainTarget = (targetUrl: URL, appUrl: URL) => {
  const appHostname = normalizeHostname(appUrl.hostname);
  const targetHostname = normalizeHostname(targetUrl.hostname);

  return targetHostname === appHostname || targetHostname.endsWith(`.${appHostname}`);
};
