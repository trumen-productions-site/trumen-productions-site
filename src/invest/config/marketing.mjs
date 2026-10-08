/**
 * The marketing plan, sold as risk reduction.
 *
 * Three cards, each needing the owner's approval (gate G_COPY). The third
 * card describes a plan; no list is collected before counsel's direction
 * (features.followList).
 */

export const marketing = {
  heading: 'The record is the campaign',
  lede: 'A true story with a paper trail markets itself differently. The documents are the content.',
  cards: [
    {
      id: 'sources',
      title: 'Primary sources as content',
      body: 'The filed opinions and the trial record, presented on screen — the kind of material that gets shared because it can be checked.',
      icon: 'document',
    },
    {
      id: 'premiere',
      title: 'South Carolina premiere',
      body: 'A hometown premiere event for cast, investors and press, in the state where the story happened.',
      icon: 'premiere',
    },
    {
      id: 'audience',
      title: 'Owned audience',
      body: 'An email list built at release and converted with tickets and editions — a direct line that no platform can switch off.',
      icon: 'audience',
    },
  ],
};

export default marketing;
