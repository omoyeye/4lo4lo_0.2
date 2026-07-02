
import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export default function SEO({
  title = '4LO4LO | Earn Points, Free QR Code Generator & URL Shortener',
  description = '4LO4LO is a global platform for creators and influencers to earn money completing social tasks, explore the Marketplace, learn from the Classroom, shorten links, generate QR codes, and grow together. Join free.',
  keywords = 'free qr code generator, url shortener, shorten link, create qr code, social media tasks, earn points, marketplace, classroom videos, learn and earn, referral rewards, creators community, influencer network, 4lo4lo',
  image = '/attached_assets/bg.png',
  url = 'https://www.4lo4lo.site/',
  type = 'website'
}: SEOProps) {
  const siteUrl = 'https://www.4lo4lo.site';
  const fullUrl = url.startsWith('http') ? url : `${siteUrl}${url}`;
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={imageUrl} />
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}
