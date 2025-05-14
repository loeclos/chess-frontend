'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const Navbar: React.FC = () => {
    const router = useRouter();

    const handleHomeClick = () => {
        router.push('/');
    };

    return (
        <nav className="flex items-center justify-start p-4">
            <button
                onClick={handleHomeClick}
                className="w-full md:w-min bg-[#4682a8] text-white px-4 py-2 rounded-md hover:bg-[#6d98ba] transition-colors duration-300 cursor-pointer"
            >
                Home
            </button>
            <Link href={'https://github.com/valdemirum/chess-frontend'} className="flex items-center ml-auto">

                <Image
                    src="/github.png"
                    alt="Logo"
                    width={100}
                    height={100}
                    className="w-10 h-10"
                />
            </Link>
        </nav>
    );
};

export default Navbar;
