"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Label, Input, Button, ErrorText, HelpText } from "@shared/ui/controls";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalTitle,
    ModalDescription,
    ModalFooter,
    ModalCloseButton,
} from "@shared/ui/modal";

export type CreateUserValues = {
    name: string;
    email: string;
    role: string;
    password: string;
};

export interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: CreateUserValues) => void | Promise<void>;
    loading?: boolean | undefined;
    error?: string | null | undefined;
    defaultValues?: Partial<CreateUserValues>;
}

const ROLE_OPTIONS = [
    { value: "auditor", label: "Auditor" },
    { value: "qc_manager", label: "QC Manager" },
    { value: "admin", label: "Administrator" },
];

/**
 * Modal for creating a new user
 */
const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
    open,
    onOpenChange,
    onSubmit,
    loading,
    error,
    defaultValues,
}) => {
    const isEditing = !!defaultValues?.name;

    const initial: CreateUserValues = useMemo(
        () => ({
            name: defaultValues?.name ?? "",
            email: defaultValues?.email ?? "",
            role: defaultValues?.role ?? "",
            password: "", // Password always empty initially
        }),
        [defaultValues]
    );

    const [values, setValues] = useState<CreateUserValues>(initial);

    useEffect(() => {
        if (open) {
            setValues(initial);
        }
    }, [open, initial]);

    const handleChange = useCallback(
        <K extends keyof CreateUserValues>(key: K, val: CreateUserValues[K]) =>
            setValues((s) => ({
                ...s,
                [key]: val,
            })),
        []
    );

    const onSubmitInternal = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            const trimmedName = values.name.trim();
            const trimmedEmail = values.email.trim();
            const trimmedPassword = values.password.trim();

            const payload: CreateUserValues = {
                name: trimmedName,
                email: trimmedEmail,
                role: values.role.trim().toLowerCase(),
                password: trimmedPassword,
            };

            await onSubmit(payload);
        },
        [onSubmit, values]
    );

    const disabled = loading === true;

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent>
                <ModalCloseButton onClick={() => onOpenChange(false)} />

                <ModalHeader>
                    <ModalTitle>{isEditing ? "Edit User" : "Add New User"}</ModalTitle>
                    <ModalDescription>
                        {isEditing
                            ? "Update user details and permissions"
                            : "Create a new user account in the system"}
                    </ModalDescription>
                </ModalHeader>

                <form onSubmit={onSubmitInternal} className="space-y-5">
                    {/* Username */}
                    <div>
                        <Label htmlFor="user-username">Name</Label>
                        <Input
                            id="user-username"
                            placeholder="Enter username"
                            value={values.name}
                            onChange={(e) => handleChange("name", e.currentTarget.value)}
                            disabled={disabled}
                            required
                        />
                        <HelpText>
                            Required.
                        </HelpText>
                    </div>

                    {/* Email */}
                    <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            type="email"
                            placeholder="Enter email address"
                            value={values.email}
                            onChange={(e) => handleChange("email", e.currentTarget.value)}
                            disabled={disabled}
                            required
                        />
                        <HelpText>
                            Required – user's email address for login and notifications.
                        </HelpText>
                    </div>

                    {/* Role */}
                    <div>
                        <Label htmlFor="user-role">Role</Label>
                        <div className="relative">
                            <select
                                id="user-role"
                                className={cn(
                                    "w-full appearance-none rounded-xl",
                                    "bg-gray-100 text-black placeholder:text-gray-500",
                                    "ring-1 ring-inset ring-gray-300 h-10 px-3 pr-9",
                                    "outline-none transition focus:bg-gray-200",
                                    "focus:ring-2 focus:ring-gray-400",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                                value={values.role}
                                onChange={(e) => handleChange("role", e.currentTarget.value)}
                                disabled={disabled}
                                required
                            >
                                <option value="">Select a role</option>
                                {ROLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        </div>
                        <HelpText>
                            Required – defines the user's permissions in the system.
                        </HelpText>
                    </div>

                    {/* Password */}
                    <div>
                        <Label htmlFor="user-password">Password</Label>
                        <Input
                            id="user-password"
                            type="password"
                            placeholder={isEditing ? "(Unchanged)" : "Enter password"}
                            value={values.password}
                            onChange={(e) => handleChange("password", e.currentTarget.value)}
                            disabled={disabled}
                            required={!isEditing}
                            withPasswordToggle
                        />
                        <HelpText>
                            {isEditing
                                ? "Leave blank to keep existing password."
                                : "Required – initial password for the user account."}
                        </HelpText>
                    </div>

                    {error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}

                    <ModalFooter>
                        <Button type="submit" isLoading={disabled} disabled={disabled}>
                            {isEditing ? "Save Changes" : "Create User"}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateUserDialog;
