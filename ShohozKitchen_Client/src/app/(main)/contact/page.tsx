import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
    title: "Contact Us — We're Here to Help",
    description: "Get in touch with Shohoz Kitchen. Call, email, or WhatsApp our team for orders, product questions, and support — we reply within minutes during business hours.",
    alternates: { canonical: "/contact" },
};

export default function ContactPage() {
    return <ContactClient />;
}
