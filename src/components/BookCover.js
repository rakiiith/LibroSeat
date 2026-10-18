import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PALETTES = [
  { base: '#184B51', accent: '#D9B56D', ink: '#FFFFFF' },
  { base: '#5A3045', accent: '#F1C9A5', ink: '#FFF8F0' },
  { base: '#29446D', accent: '#E8C878', ink: '#FFFFFF' },
  { base: '#4B5940', accent: '#D5D5A5', ink: '#FFFFFF' },
  { base: '#694630', accent: '#EDC7A0', ink: '#FFF8F0' },
];

function paletteFor(book) {
  const key = `${book?.category || ''}${book?.title || ''}`;
  const index = [...key].reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTES.length;
  return PALETTES[index];
}

export function bookCoverUrl(book) {
  const explicit = book?.coverUrl || book?.cover_url;
  if (explicit) return String(explicit).trim();
  const isbn = String(book?.isbn || '').replace(/[^0-9Xx]/g, '');
  return isbn.length === 10 || isbn.length === 13
    ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
    : '';
}

/** Displays a catalog cover, falling back to a title-based cover card. */
export default function BookCover({ book, style, variant = 'small' }) {
  const large = variant === 'large';
  const uri = bookCoverUrl(book);
  const [failedUri, setFailedUri] = useState('');
  const palette = paletteFor(book);
  const showImage = Boolean(uri && failedUri !== uri);

  useEffect(() => setFailedUri(''), [uri]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${book?.title || 'Book'} cover`}
      style={[styles.cover, { backgroundColor: palette.base }, style]}
    >
      {showImage ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailedUri(uri)} />
      ) : (
        <>
          <View style={[styles.topRule, { backgroundColor: palette.accent }]} />
          <Ionicons name="book-outline" size={large ? 36 : 20} color={palette.accent} />
          <Text numberOfLines={3} style={[styles.title, large && styles.titleLarge, { color: palette.ink }]}>{book?.title || 'Untitled Book'}</Text>
          <Text numberOfLines={1} style={[styles.author, large && styles.authorLarge, { color: palette.ink }]}>{book?.author || 'Library collection'}</Text>
          <View style={[styles.bottomRule, { backgroundColor: palette.accent }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(12,35,43,0.1)' },
  topRule: { position: 'absolute', left: '12%', right: '12%', top: '10%', height: 2, opacity: 0.9 },
  title: { textAlign: 'center', fontSize: 9, lineHeight: 11, fontWeight: '800', marginTop: 5 },
  titleLarge: { fontSize: 16, lineHeight: 20, marginTop: 12 },
  author: { textAlign: 'center', fontSize: 7, lineHeight: 9, opacity: 0.78, marginTop: 4 },
  authorLarge: { fontSize: 11, lineHeight: 14, marginTop: 8 },
  bottomRule: { position: 'absolute', left: '28%', right: '28%', bottom: '9%', height: 2, opacity: 0.9 },
});
