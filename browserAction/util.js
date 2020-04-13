function formatMeaning(meaning) {
  meaning = meaning.replace(/{bc}/g, '');
  meaning = meaning.replace(/{ldquo}/g, '"');
  meaning = meaning.replace(/{rdquo}/g, '"');
  meaning = meaning.replace(/{b}/g, '<b>');
  meaning = meaning.replace(/{\/b}/g, '</b>');
  meaning = meaning.replace(/{inf}/g, '<sub>');
  meaning = meaning.replace(/{\/inf}/g, '</sub>');
  meaning = meaning.replace(/{sup}/g, '<sup>');
  meaning = meaning.replace(/{\/sup}/g, '</sup>');
  meaning = meaning.replace(/{it}/g, '<i>');
  meaning = meaning.replace(/{\/it}/g, '</i>');

  return meaning;
}