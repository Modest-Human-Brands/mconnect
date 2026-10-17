import nodeHtmlToImage from 'node-html-to-image'

/** Renders an HTML document to a PNG using headless Chromium (email-width viewport). */
export default async function (html: string, width = 576, height = 600) {
  const image = await nodeHtmlToImage({
    html,
    type: 'png',
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width, height },
    },
  })
  return image as Buffer
}
