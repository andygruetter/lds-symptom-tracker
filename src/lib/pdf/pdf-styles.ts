import { StyleSheet } from '@react-pdf/renderer'

/** Professional Slate Theme: #374955 Primary, #F6F7F9 Background */
export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    color: '#374955',
  },
  // Header
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#374955',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#374955',
  },
  headerMeta: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
  },
  // Section headings
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#374955',
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // Summary
  summaryText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374955',
    marginBottom: 4,
  },
  // Tables
  table: {
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F6F7F9',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374955',
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
    color: '#4B5563',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // Column widths for ranking table
  colRank: { width: '8%' },
  colName: { width: '40%' },
  colCount: { width: '17%' },
  colTrend: { width: '17%' },
  colIntensity: { width: '18%' },
  // Event detail cards
  eventCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F6F7F9',
    borderRadius: 4,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374955',
  },
  eventDate: {
    fontSize: 9,
    color: '#6B7280',
  },
  eventTranscription: {
    fontSize: 9,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.5,
  },
  eventMeta: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  photo: {
    maxWidth: 200,
    objectFit: 'contain',
    borderRadius: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  // Badge
  badge: {
    backgroundColor: '#374955',
    color: '#FFFFFF',
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  // Timeline table column widths
  colMonth: { width: '25%' },
  colSymptoms: { width: '25%' },
  colMedications: { width: '25%' },
  colTotal: { width: '25%' },
})
