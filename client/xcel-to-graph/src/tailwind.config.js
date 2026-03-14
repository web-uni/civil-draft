/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#11384C',
                navy: {
                    900: '#0a1d3b',
                },
            },
        },
    },
    plugins: [
        // require('tailwind-scrollbar-hide')
    ],
}
