import {ImageResponse} from 'next/og';

export const alt = 'Election Map — build your Canadian federal election prediction map';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

// Social preview card, generated at build time
export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                color: '#D71920',
                borderTop: '24px solid #D71920',
                borderBottom: '24px solid #D71920',
                fontFamily: 'sans-serif',
            }}>
                <div style={{fontSize: 160}}>🍁</div>
                <div style={{fontSize: 96, fontWeight: 700}}>Election Map</div>
                <div style={{fontSize: 40, marginTop: 16, color: '#333'}}>Build and share your riding-by-riding prediction</div>
            </div>
        ),
        size,
    );
}
