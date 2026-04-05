"use client";

import { useState } from "react";
import { trpc } from "@/client/trpc";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { LibrarianOnly, ForLibrarianEyesOnly } from "@/components/RoleGuard";
import { Shield, Crown, UserMinus, Ban, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PatronsAdminPage() {
  const { isLibrarian, isLoading } = usePatronAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: patrons, isLoading: isLoadingPatrons } = trpc.patrons.list.useQuery();
  const { data: currentUser } = trpc.patrons.me.useQuery();

  const toggleLibrarianMutation = trpc.patrons.setLibrarianStatus.useMutation({
    onSuccess: () => {
      utils.patrons.list.invalidate();
      utils.patrons.me.invalidate();
    },
  });

  const deletePatronMutation = trpc.patrons.delete.useMutation({
    onSuccess: () => {
      utils.patrons.list.invalidate();
      setDeleteConfirm(null);
    },
  });

  const filteredPatrons = patrons?.filter((patron) => {
    const search = searchQuery.toLowerCase();
    return (
      patron.fullName.toLowerCase().includes(search) ||
      patron.telegramUsername?.toLowerCase().includes(search) ||
      patron.phoneNumber.includes(search)
    );
  });

  const isSelf = (patronId: number) => currentUser?.id === patronId;
  const canModify = (patronId: number) => !isSelf(patronId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <LibrarianOnly
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <ForLibrarianEyesOnly />
        </div>
      }
    >
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Patron Management
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manage library patrons and permissions
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {patrons?.length || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Patrons</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                {patrons?.filter((p) => p.isLibrarian).length || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Librarians</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {patrons?.filter((p) => !p.isLibrarian).length || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Patrons</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {patrons?.filter((p) => p.isLibrarian || !p.isLibrarian).length || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Registered</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, username, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Patrons List */}
          {isLoadingPatrons ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : filteredPatrons && filteredPatrons.length > 0 ? (
            <div className="space-y-2">
              {filteredPatrons.map((patron) => (
                <div
                  key={patron.id}
                  className={`bg-white dark:bg-zinc-900 rounded-lg p-4 border ${
                    isSelf(patron.id)
                      ? "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                          {patron.fullName}
                        </h3>
                        {patron.isLibrarian && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Librarian
                          </Badge>
                        )}
                        {isSelf(patron.id) && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <p>@{patron.telegramUsername || "no username"}</p>
                        <p>{patron.phoneNumber}</p>
                        <p className="text-xs">
                          Joined: {new Date(patron.dateRegistered).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canModify(patron.id) && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={patron.isLibrarian ? "outline" : "default"}
                          onClick={() =>
                            toggleLibrarianMutation.mutate({
                              patronId: patron.id,
                              isLibrarian: !patron.isLibrarian,
                            })
                          }
                          disabled={toggleLibrarianMutation.isPending}
                        >
                          {patron.isLibrarian ? (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-1" />
                              Make Librarian
                            </>
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(patron.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {searchQuery ? "No patrons match your search." : "No patrons registered yet."}
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <UserMinus className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Delete Patron?
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {patrons?.find((p) => p.id === deleteConfirm)?.fullName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={deletePatronMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deletePatronMutation.mutate({ patronId: deleteConfirm })
                }
                disabled={deletePatronMutation.isPending}
              >
                {deletePatronMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </LibrarianOnly>
  );
}
