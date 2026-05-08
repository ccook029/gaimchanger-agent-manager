/**
 * Marketing plan PDF — branded for Gaimchanger Golf, formatted for the GC
 * Team to review and approve before shipping to Predis.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import { MarketingPlan, MarketingPlanItem } from './types';

const GOLD = '#B5A36B';
const DARK = '#1a1a1a';
const MUTED = '#666666';
const LINE = '#e5e5e5';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: DARK,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  metaText: {
    fontSize: 9,
    color: MUTED,
  },
  h1: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 4,
    marginBottom: 4,
  },
  para: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 6,
    color: '#333333',
  },
  goalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 6,
  },
  goalCard: {
    backgroundColor: '#f9f6ee',
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: 6,
    minWidth: 140,
  },
  goalLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 2,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  themeChip: {
    fontSize: 9,
    backgroundColor: '#f5f1e3',
    color: DARK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  postCard: {
    borderWidth: 1,
    borderColor: LINE,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  postDate: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
  },
  postChips: {
    flexDirection: 'row',
    gap: 4,
  },
  smallChip: {
    fontSize: 8,
    backgroundColor: '#f3f3f3',
    color: DARK,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  postTheme: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  postLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  postBody: {
    fontSize: 9,
    color: '#333333',
    lineHeight: 1.5,
    marginTop: 1,
  },
  postHashtags: {
    fontSize: 9,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  signoff: {
    marginTop: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
  },
  signoffTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  signoffLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sigBox: {
    width: '45%',
  },
  sigLabel: {
    fontSize: 8,
    color: MUTED,
    marginTop: 4,
  },
  sigUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#888888',
    height: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },
  pageNumber: {
    fontSize: 8,
    color: '#999999',
  },
});

function PostBlock({ item }: { item: MarketingPlanItem }) {
  return (
    <View style={styles.postCard} wrap={false}>
      <View style={styles.postHeader}>
        <Text style={styles.postDate}>
          {item.date} · {item.postTime}
        </Text>
        <View style={styles.postChips}>
          <Text style={styles.smallChip}>{item.platform}</Text>
          <Text style={styles.smallChip}>{item.format}</Text>
        </View>
      </View>
      <Text style={styles.postTheme}>{item.theme}</Text>

      <Text style={styles.postLabel}>Hook</Text>
      <Text style={styles.postBody}>{item.hook}</Text>

      <Text style={styles.postLabel}>Visual concept</Text>
      <Text style={styles.postBody}>{item.visualConcept}</Text>

      <Text style={styles.postLabel}>Caption</Text>
      <Text style={styles.postBody}>{item.caption}</Text>

      {item.hashtags.length > 0 && (
        <Text style={styles.postHashtags}>{item.hashtags.join(' ')}</Text>
      )}
    </View>
  );
}

function PlanDocument({ plan }: { plan: MarketingPlan }) {
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Strip the json-plan code block from the raw report so the brief reads cleanly
  const briefText = plan.rawReport
    .replace(/```json-plan[\s\S]*?```/g, '')
    .trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>GAIMCHANGER</Text>
          <Text style={styles.subtitle}>Marketing Plan — Week of {plan.weekOf}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Prepared by Bryce Studio · Director of Creative Strategy</Text>
          <Text style={styles.metaText}>Generated {generatedAt}</Text>
        </View>

        <Text style={styles.h1}>Week of {plan.weekOf}</Text>
        <Text style={styles.para}>
          Status: {plan.status.toUpperCase()} · {plan.items.length} posts planned
        </Text>

        {plan.goals.length > 0 && (
          <>
            <Text style={styles.h2}>Goals</Text>
            <View style={styles.goalsRow}>
              {plan.goals.map((g, i) => (
                <View key={i} style={styles.goalCard}>
                  <Text style={styles.goalLabel}>{g.metric}</Text>
                  <Text style={styles.goalValue}>{g.target}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {plan.themes.length > 0 && (
          <>
            <Text style={styles.h2}>Themes</Text>
            <View style={styles.themeRow}>
              {plan.themes.map((t, i) => (
                <Text key={i} style={styles.themeChip}>{t}</Text>
              ))}
            </View>
          </>
        )}

        {briefText && (
          <>
            <Text style={styles.h2}>Strategy Brief</Text>
            {briefText.split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith('## ')) {
                return <Text key={i} style={styles.h3}>{trimmed.replace(/^##\s*/, '')}</Text>;
              }
              if (trimmed.startsWith('# ')) {
                return <Text key={i} style={styles.h3}>{trimmed.replace(/^#\s*/, '')}</Text>;
              }
              return <Text key={i} style={styles.para}>{trimmed.replace(/\*\*/g, '')}</Text>;
            })}
          </>
        )}

        <Text style={styles.h2}>Content Calendar</Text>
        {plan.items.map((item) => (
          <PostBlock key={item.id} item={item} />
        ))}

        <View style={styles.signoff} wrap={false}>
          <Text style={styles.signoffTitle}>Approval</Text>
          <Text style={styles.metaText}>
            By signing below, the GC Team approves this plan to be sent to Predis.ai
            for content generation and scheduled publishing.
          </Text>
          <View style={styles.signoffLine}>
            <View style={styles.sigBox}>
              <View style={styles.sigUnderline} />
              <Text style={styles.sigLabel}>Signature</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigUnderline} />
              <Text style={styles.sigLabel}>Date</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Gaimchanger Golf · Corporate HQ</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePlanPDF(plan: MarketingPlan): Promise<Buffer> {
  const buffer = await renderToBuffer(<PlanDocument plan={plan} />);
  return Buffer.from(buffer);
}
