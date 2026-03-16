/**
 * React PDF report generation — branded Gaimchanger Golf reports.
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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#2d8a4e',
    paddingBottom: 12,
    marginBottom: 20,
  },
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#2d8a4e',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  metaText: {
    fontSize: 9,
    color: '#888888',
  },
  content: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333333',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  alertCritical: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 8,
    marginBottom: 6,
    fontSize: 9,
  },
  alertWarning: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    padding: 8,
    marginBottom: 6,
    fontSize: 9,
  },
  alertInfo: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    padding: 8,
    marginBottom: 6,
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },
});

interface ReportDocProps {
  agentName: string;
  agentTitle: string;
  department: string;
  date: string;
  content: string;
}

/**
 * Parse markdown-like report content into structured sections.
 */
function parseReportContent(content: string): Array<{ type: string; text: string }> {
  const lines = content.split('\n');
  const sections: Array<{ type: string; text: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      sections.push({ type: 'heading', text: trimmed.replace(/^#+\s*/, '') });
    } else if (trimmed.includes('🔴') || trimmed.includes('🚨')) {
      sections.push({ type: 'critical', text: trimmed });
    } else if (trimmed.includes('🟡')) {
      sections.push({ type: 'warning', text: trimmed });
    } else if (trimmed.startsWith('ℹ️') || trimmed.startsWith('- ℹ️')) {
      sections.push({ type: 'info', text: trimmed });
    } else {
      sections.push({ type: 'text', text: trimmed });
    }
  }

  return sections;
}

function ReportDocument({ agentName, agentTitle, department, date, content }: ReportDocProps) {
  const sections = parseReportContent(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>Gaimchanger Golf</Text>
          <Text style={styles.subtitle}>Corporate HQ — AI Agent Report</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {agentName} — {agentTitle} | {department}
          </Text>
          <Text style={styles.metaText}>{date}</Text>
        </View>

        <View style={styles.content}>
          {sections.map((section, i) => {
            switch (section.type) {
              case 'heading':
                return (
                  <Text key={i} style={styles.sectionTitle}>
                    {section.text}
                  </Text>
                );
              case 'critical':
                return (
                  <View key={i} style={styles.alertCritical}>
                    <Text>{section.text}</Text>
                  </View>
                );
              case 'warning':
                return (
                  <View key={i} style={styles.alertWarning}>
                    <Text>{section.text}</Text>
                  </View>
                );
              case 'info':
                return (
                  <View key={i} style={styles.alertInfo}>
                    <Text>{section.text}</Text>
                  </View>
                );
              default:
                return (
                  <Text key={i} style={styles.paragraph}>
                    {section.text}
                  </Text>
                );
            }
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gaimchanger Golf — Corporate HQ
          </Text>
          <Text style={styles.footerText}>
            Powered by Anthropic Claude | {date}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Generate a branded PDF report buffer.
 */
export async function generateReportPDF(
  agentName: string,
  agentTitle: string,
  department: string,
  content: string
): Promise<Buffer> {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const buffer = await renderToBuffer(
    <ReportDocument
      agentName={agentName}
      agentTitle={agentTitle}
      department={department}
      date={date}
      content={content}
    />
  );

  return Buffer.from(buffer);
}
