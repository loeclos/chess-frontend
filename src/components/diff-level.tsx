'use client';

import * as React from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { Status } from '@/types/diff';

const statuses: Status[] = [
    {
        value: 'easy',
        label: 'Easy',
    },
    {
        value: 'medium',
        label: 'Medium',
    },
    {
        value: 'medium rare',
        label: 'Medium rare',
    },
    {
        value: 'hard',
        label: 'Hard',
    },
    {
        value: 'very hard',
        label: 'Very hard',
    },
];

export default function DiffLevel({
    selectedStatus,
    setSelectedStatus,
    className,
}: {
    selectedStatus: Status | null;
    setSelectedStatus: (status: Status | null) => void;
    className?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const isDesktop = useMediaQuery('(min-width: 768px)');


    if (isDesktop) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={`w-[150px] justify-start ${className}`}
                    >
                        {selectedStatus ? (
                            <>{selectedStatus.label}</>
                        ) : (
                            <>+ Set difficulty</>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <StatusList
                        setOpen={setOpen}
                        setSelectedStatus={setSelectedStatus}
                    />
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-start">
                    {selectedStatus ? (
                        <>{selectedStatus.label}</>
                    ) : (
                        <>+ Set status</>
                    )}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mt-4 border-t">
                    <StatusList
                        setOpen={setOpen}
                        setSelectedStatus={setSelectedStatus}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function StatusList({
    setOpen,
    setSelectedStatus,
}: {
    setOpen: (open: boolean) => void;
    setSelectedStatus: (status: Status | null) => void;
}) {
    return (
        <Command>
            <CommandInput placeholder="Filter status..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    {statuses.map((status) => (
                        <CommandItem
                            key={status.value}
                            value={status.value}
                            onSelect={(value) => {
                                setSelectedStatus(
                                    statuses.find(
                                        (priority) => priority.value === value
                                    ) || null
                                );
                                setOpen(false);
                            }}
                        >
                            {status.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}
