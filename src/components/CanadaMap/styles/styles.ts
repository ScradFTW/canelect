// Styles for the CanadaMap component
import { CSSProperties } from 'react';

// Container styles
export const containerStyle: CSSProperties = {
    fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    color: '#333',
    padding: '24px 20px',
    maxWidth: 1200,
    margin: 'auto',
    lineHeight: 1.5,
};

// Header styles
export const headerStyle: CSSProperties = {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 32,
    fontWeight: 700,
    color: '#222',
};

// Paragraph styles
export const paragraphStyle: CSSProperties = {
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 16,
    lineHeight: 1.6,
    color: '#555',
};

// Map wrapper styles
export const mapWrapperStyle: CSSProperties = {
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    marginBottom: 28,
    border: '1px solid #f0f0f0',
};

// Summary card styles
export const summaryCardStyle: CSSProperties = {
    background: '#ffffff',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginTop: 28,
    border: '1px solid #f0f0f0',
};

// Summary header styles
export const summaryHeaderStyle: CSSProperties = {
    marginBottom: 20,
    fontSize: 22,
    borderBottom: '1px solid #eaeaea',
    paddingBottom: 12,
    fontWeight: 600,
    color: '#222',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

// Stats list styles
export const statsListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
};

// Stat item styles
export const statItemStyle: CSSProperties = {
    fontSize: 15,
    padding: '4px 0',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

// Buttons container styles
export const buttonsContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'flex-end',
};

// Button styles
export const buttonStyle: CSSProperties = {
    background: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: 500,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

// Button disabled styles
export const buttonDisabledStyle: CSSProperties = {
    background: '#ccc',
    cursor: 'not-allowed',
    boxShadow: 'none',
};

// Accordion styles
export const accordionStyle: CSSProperties = {
    background: '#ffffff',
    padding: 28,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginTop: 28,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #f0f0f0',
};

// Accordion header styles
export const accordionHeaderStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    fontSize: 18,
    borderBottom: '1px solid #eaeaea',
    paddingBottom: 12,
    fontWeight: 600,
};

// Accordion content styles
export const accordionContentStyle: CSSProperties = {
    marginTop: 16,
    padding: '0 8px',
    maxHeight: '500px',
    overflowY: 'auto',
    scrollbarColor: '#d0d0d0 #f5f5f5',
};

// Riding list styles
export const ridingListStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '10px',
};

// Riding item styles
export const ridingItemStyle: CSSProperties = {
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 6,
    background: '#E0E0E0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontWeight: 500,
};