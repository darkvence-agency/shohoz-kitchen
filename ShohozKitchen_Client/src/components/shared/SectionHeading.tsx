import React from 'react';

interface SectionHeadingProps {
    heading: string;
    colorHeading: string;
    description: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ heading, colorHeading, description }) => {
    return (
        <div>
            <div>
                <h3 className='text-2xl sm:text-3xl md:text-4xl text-gray-700 font-semibold'>
                    {heading} <span className='text-[var(--color-primary)]'>{colorHeading}</span>
                </h3>
                <p className='text-[var(--color-secondary)] text-sm'>{description}</p>
            </div>
        </div>
    );
};

export default SectionHeading;
