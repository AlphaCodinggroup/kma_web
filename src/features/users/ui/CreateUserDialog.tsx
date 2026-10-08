"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Los valores son los nombres de los grupos de Cognito, que es lo que el
// backend valida con GetGroup. "qc_manager" no es un grupo: el alta de un
// usuario de QC respondía 400 "invalid role" y no se podía crear el rol que
// hace la revisión del reporte.
const ROLE_OPTIONS = [
    { value: "auditor", label: "Auditor" },
    { value: "qc", label: "QC Manager" },
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
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateUserValues, string>>>({});
    const submittingRef = useRef(false);

    useEffect(() => {
        if (open) {
            setValues(initial);
            setFieldErrors({});
        }
    // Las respuestas de guardado no deben borrar el texto que ya se editó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleChange = useCallback(
        <K extends keyof CreateUserValues>(key: K, val: CreateUserValues[K]) => {
            setValues((s) => ({ ...s, [key]: val }));
            setFieldErrors((errors) => ({ ...errors, [key]: undefined }));
        },
        []
    );

    const onSubmitInternal = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (loading || submittingRef.current) return;

            const trimmedName = values.name.trim();
            const trimmedEmail = values.email.trim();
            const trimmedPassword = values.password.trim();

            const payload: CreateUserValues = {
                name: trimmedName,
                email: trimmedEmail,
                role: values.role.trim().toLowerCase(),
                password: trimmedPassword,
            };

            const errors: Partial<Record<keyof CreateUserValues, string>> = {};
            if (!trimmedName) errors.name = "Name is required.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.email = "Enter a valid email address.";
            const selectedRole = e.currentTarget.querySelector<HTMLSelectElement>("#user-role")?.value;
            if (!selectedRole || !ROLE_OPTIONS.some(option => option.value === payload.role)) errors.role = "Choose a role.";
            if (!isEditing && !trimmedPassword) errors.password = "Password is required.";
            setFieldErrors(errors);
            const firstError = (Object.keys(errors) as (keyof CreateUserValues)[])[0];
            if (firstError) {
                const ids = { name: "user-username", email: "user-email", role: "user-role", password: "user-password" };
                e.currentTarget.querySelector<HTMLElement>(`#${ids[firstError]}`)?.focus();
                return;
            }
            submittingRef.current = true;
            try { await onSubmit(payload); }
            finally { submittingRef.current = false; }
        },
        [onSubmit, values, loading, isEditing]
    );

    const disabled = loading === true;

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent className="max-w-2xl">
                <ModalCloseButton onClick={() => onOpenChange(false)} />

                <ModalHeader>
                    <ModalTitle>{isEditing ? "Edit User" : "Add New User"}</ModalTitle>
                    <ModalDescription>
                        {isEditing
                            ? "Update user details and permissions"
                            : "Create a new user account in the system"}
                    </ModalDescription>
                </ModalHeader>

                <form noValidate onSubmit={onSubmitInternal} className="grid gap-x-6 gap-y-5 border-t border-[var(--kma-border)] pt-5 sm:grid-cols-2 [&_input]:min-h-11 [&_select]:min-h-11">
                    {/* Username */}
                    <div>
                        <Label htmlFor="user-username">Name</Label>
                        <Input
                            id="user-username"
                            aria-invalid={Boolean(fieldErrors.name)}
                            aria-describedby={fieldErrors.name ? "user-username-error" : undefined}
                            placeholder="Enter username"
                            value={values.name}
                            onChange={(e) => handleChange("name", e.currentTarget.value)}
                            disabled={disabled}
                            required
                        />
                        {fieldErrors.name ? <ErrorText id="user-username-error" role="alert">{fieldErrors.name}</ErrorText> : <HelpText>Required.</HelpText>}
                    </div>

                    {/* Email */}
                    <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? "user-email-error" : undefined}
                            type="email"
                            placeholder="Enter email address"
                            value={values.email}
                            onChange={(e) => handleChange("email", e.currentTarget.value)}
                            disabled={disabled}
                            required
                        />
                        {fieldErrors.email ? <ErrorText id="user-email-error" role="alert">{fieldErrors.email}</ErrorText> : <HelpText>Required – user's email address for login and notifications.</HelpText>}
                    </div>

                    {/* Role */}
                    <div>
                        <Label htmlFor="user-role">Role</Label>
                        <div className="relative">
                            <select
                                id="user-role"
                            aria-invalid={Boolean(fieldErrors.role)}
                            aria-describedby={fieldErrors.role ? "user-role-error" : undefined}
                                className={cn(
                                    "w-full appearance-none rounded",
                                    "bg-[var(--kma-subtle)] text-[var(--kma-fg)] placeholder:text-[var(--kma-muted)]",
                                    "border border-[var(--kma-border)] min-h-11 px-3 pr-9",
                                    "outline-none transition focus:bg-[var(--kma-subtle)]",
                                    "focus:ring-2 focus:ring-[var(--kma-primary)]",
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
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--kma-muted)]" />
                        </div>
                        {fieldErrors.role ? <ErrorText id="user-role-error" role="alert">{fieldErrors.role}</ErrorText> : <HelpText>Required – defines the user's permissions in the system.</HelpText>}
                    </div>

                    {/* Password */}
                    <div>
                        <Label htmlFor="user-password">Password</Label>
                        <Input
                            id="user-password"
                            aria-invalid={Boolean(fieldErrors.password)}
                            aria-describedby={fieldErrors.password ? "user-password-error" : undefined}
                            type="password"
                            placeholder={isEditing ? "(Unchanged)" : "Enter password"}
                            value={values.password}
                            onChange={(e) => handleChange("password", e.currentTarget.value)}
                            disabled={disabled}
                            required={!isEditing}
                            withPasswordToggle
                        />
                        {fieldErrors.password ? <ErrorText id="user-password-error" role="alert">{fieldErrors.password}</ErrorText> : <HelpText>{isEditing ? "Leave blank to keep existing password." : "Required – initial password for the user account."}</HelpText>}
                    </div>

                    <div className="sm:col-span-2">{error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}</div>

                    <ModalFooter className="border-t border-[var(--kma-border)] pt-4 sm:col-span-2">
                        <Button fullWidth={false} type="submit" isLoading={disabled} disabled={disabled}>
                            {isEditing ? "Save Changes" : "Create User"}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateUserDialog;
