/**
 * Runtime settings derived from the environment, with the defaults the page
 * itself uses so the server and the HTML cannot disagree about the call.
 */

export function settings(env) {
  return {
    siteUrl: (env.SITE_URL || 'https://trumen-productions.netlify.app').replace(/\/$/, ''),
    producerEmail: env.PRODUCER_EMAIL || 'michaelmartin@greenplanit.org',
    contactEmail: env.CONTACT_EMAIL || 'michaelmartin@greenplanit.org',
    hostTitle: env.HOST_TITLE || 'the producer',
    hostName: env.HOST_NAME || 'The producer',
    hostTimezone: env.HOST_TIMEZONE || 'America/New_York',
    durationMinutes: Number(env.BOOKING_DURATION_MINUTES || 30),
    /** Earliest bookable slot: this many hours from now. */
    leadTimeHours: Number(env.BOOKING_LEAD_TIME_HOURS || 4),
    /** How far ahead the calendar may be queried. */
    horizonDays: Number(env.BOOKING_HORIZON_DAYS || 60),
    abandonMinutes: Number(env.ABANDON_MINUTES || 30),
    smsEnabled: env.FEATURE_SMS === 'true',
    followListEnabled: env.FEATURE_FOLLOW_LIST === 'true',
    prepare: [
      'Any questions about the production, the terms or the timeline.',
      'A sense of the range you are considering — nothing is decided on the call.',
      'Nothing to sign and nothing to bring. Verification, if you proceed, happens afterwards through a third party.',
    ],
    notAnOffer:
      'This message is for information only. It is not an offer to sell or a solicitation of an offer to buy any security. ' +
      'Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified. ' +
      'Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.',
  };
}
